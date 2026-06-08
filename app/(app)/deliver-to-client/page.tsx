'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { usePaginated, useDebounce } from '@/hooks/useApi';
import { formatRupiah, formatDate } from '@/lib/utils';
import {
  Plus, Search, Eye, X, Upload, Trash2,
  Truck, CheckCircle2, AlertCircle, Loader2, ChevronDown, Package,
  FileText, Building2, Calendar, Hash, MapPin, User,
  ListChecks, ChevronUp, Info
} from 'lucide-react';
import Pagination from '@/components/Pagination';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeliveryOrder {
  id: number;
  do_code: string;
  so_code: string;
  so_customer_name?: string;
  courier: string;
  tracking_number: string;
  status: 'shipping' | 'delivered' | 'cancelled';
  shipping_date: string;
  shipping_cost: number;
  shipping_proof: string | null;
  proof_of_delivery: string | null;
  delivered_date: string | null;
  delivered_by: string | null;
  notes: string | null;
  po_count?: number;
  created_at: string;
  created_by: string;
}

interface SO {
  so_code: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface AvailableStockItem {
  product_code: string;
  product_name: string;
  so_qty: number;
  unit_price: number;
  so_item_code: string;
  total_available: number;
  remaining_to_ship: number;
  po_items: {
    po_item_code: string;
    po_code: string;
    supplier_name: string;
    available_qty: number;
    purchase_price: number;
  }[];
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let toastId = 0;

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const icons = {
          success: <CheckCircle2 size={16} className="shrink-0" style={{ color: '#059669' }} />,
          error:   <AlertCircle  size={16} className="shrink-0" style={{ color: '#dc2626' }} />,
          info:    <Info         size={16} className="shrink-0" style={{ color: '#2563eb' }} />,
        };
        const colors = {
          success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
          error:   { bg: '#fef2f2', border: '#fca5a5', text: '#7f1d1d' },
          info:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a' },
        };
        const c = colors[t.type];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg text-[13px] font-medium max-w-[340px]"
            style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, animation: 'slideIn .2s ease' }}
          >
            {icons[t.type]}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button className="opacity-50 hover:opacity-100 mt-0.5" onClick={() => onRemove(t.id)}>
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const remove = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);
  const add = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = ++toastId;
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => remove(id), duration);
  }, [remove]);
  return {
    toasts, remove,
    success: (msg: string) => add('success', msg),
    error:   (msg: string) => add('error',   msg, 6000),
    info:    (msg: string) => add('info',     msg),
  };
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  open, title, message, confirmLabel = 'Konfirmasi', onConfirm, onCancel,
}: {
  open: boolean; title: string; message: string;
  confirmLabel?: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl p-5 w-[340px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: '#fef2f2' }}>
            <AlertCircle size={16} style={{ color: '#dc2626' }} />
          </div>
          <div>
            <div className="font-semibold text-[14px]" style={{ color: 'var(--color-text)' }}>{title}</div>
            <div className="text-[12.5px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{message}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-outline btn-sm" onClick={onCancel}>Batal</button>
          <button className="btn btn-sm" style={{ background: '#dc2626', color: '#fff', border: 'none' }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DO_STATUS: Record<string, { label: string; color: string }> = {
  shipping:  { label: 'Pengiriman', color: 'blue' },
  delivered: { label: 'Tersampaikan', color: 'green' },
  cancelled: { label: 'Batal', color: 'red' },
};

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];
const COURIERS = ['JNE REG', 'JNE OKE', 'JNE YES', 'SiCepat REG', 'SiCepat BEST', 'J&T Express', 'Anteraja', 'GoSend', 'GrabExpress', 'Ninja Xpress'];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DeliverToClientPage() {
  const toast = useToast();

  // Filter states
  const [searchLocal, setSearchLocal] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebounce(searchLocal, 400);

  const { data, meta, loading, refetch, setSearch, setPage, setLimit, setStatus, setParam } =
    usePaginated<DeliveryOrder>('/api/deliver-to-client');

  useEffect(() => { setSearch(debouncedSearch); setPage(1); }, [debouncedSearch]);

  // Detail drawer
  const [selectedDO, setSelectedDO] = useState<DeliveryOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [soList, setSoList] = useState<SO[]>([]);
  const [selectedSO, setSelectedSO] = useState<SO | null>(null);
  const [availableStock, setAvailableStock] = useState<AvailableStockItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, {
    po_items: { po_item_code: string; quantity: number; purchase_price: number }[];
    total_qty: number;
  }>>({});
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
  
  const [createForm, setCreateForm] = useState({
    courier: '',
    tracking_number: '',
    shipping_date: new Date().toISOString().split('T')[0],
    shipping_cost: '',
    notes: '',
  });
  const [shippingProof, setShippingProof] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirm delivered modal
  const [showConfirmDelivered, setShowConfirmDelivered] = useState(false);
  const [confirmDO, setConfirmDO] = useState<DeliveryOrder | null>(null);
  const [deliveredForm, setDeliveredForm] = useState({
    delivered_date: new Date().toISOString().split('T')[0],
    delivered_by: '',
    notes: '',
  });
  const [proofOfDelivery, setProofOfDelivery] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);
  const podFileInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const [stats, setStats] = useState({ totalDO: 0, shipping: 0, delivered: 0 });

  // ── Fetch helper ────────────────────────────────────────────────────────────
  const fetchSOList = async () => {
    try {
      const res = await fetch('/api/sales-orders?status=processing&limit=200');
      const d = await res.json();
      if (d.success) setSoList(d.data || []);
    } catch { /* silent */ }
  };

  const fetchAvailableStock = async (soCode: string) => {
    setLoadingStock(true);
    try {
      const res = await fetch(`/api/deliver-to-client?action=available-stock&so_code=${soCode}`);
      const d = await res.json();
      if (d.success) {
        setAvailableStock(d.data);
        const initSelected: typeof selectedItems = {};
        for (const item of d.data) {
          initSelected[item.product_code] = {
            po_items: [],
            total_qty: 0
          };
        }
        setSelectedItems(initSelected);
      } else {
        setAvailableStock([]);
      }
    } catch {
      setAvailableStock([]);
    } finally {
      setLoadingStock(false);
    }
  };

  const fetchDetail = async (doCode: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/deliver-to-client?do_code=${doCode}`);
      const d = await res.json();
      if (d.success) setDetailData(d.data);
      else setDetailData(null);
    } catch { setDetailData(null); }
    finally { setDetailLoading(false); }
  };

  // Update stats
  useEffect(() => {
    if (data.length > 0) {
      setStats({
        totalDO: data.length,
        shipping: data.filter(d => d.status === 'shipping').length,
        delivered: data.filter(d => d.status === 'delivered').length,
      });
    }
  }, [data]);

  // ── Filter handlers ─────────────────────────────────────────────────────────
  const applyFilters = () => {
    setSearch(searchLocal);
    setParam('from', dateFrom);
    setParam('to', dateTo);
    setPage(1);
  };

  const resetFilters = () => {
    setSearchLocal('');
    setSearch('');
    setStatusFilter('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setParam('from', '');
    setParam('to', '');
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setStatus(value);
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearchLocal(value);
    // search is triggered via useDebounce effect
  };

  // ── Create handlers ─────────────────────────────────────────────────────────
  const openCreateModal = async () => {
    await fetchSOList();
    setShowCreate(true);
    setSelectedSO(null);
    setAvailableStock([]);
    setSelectedItems({});
    setExpandedProducts({});
    setCreateForm({
      courier: '',
      tracking_number: '',
      shipping_date: new Date().toISOString().split('T')[0],
      shipping_cost: '',
      notes: '',
    });
    setShippingProof(null);
  };

  const handleSOChange = async (soCode: string) => {
    const so = soList.find(s => s.so_code === soCode);
    setSelectedSO(so || null);
    if (soCode) {
      await fetchAvailableStock(soCode);
    } else {
      setAvailableStock([]);
      setSelectedItems({});
    }
  };

  const updatePOItemQuantity = (productCode: string, poItemCode: string, maxQty: number, purchasePrice: number) => {
    setSelectedItems(prev => {
      const current = prev[productCode] || { po_items: [], total_qty: 0 };
      const existingIndex = current.po_items.findIndex(pi => pi.po_item_code === poItemCode);
      let newPoItems = [...current.po_items];
      
      let newQty = 1;
      if (existingIndex >= 0) {
        newQty = current.po_items[existingIndex].quantity + 1;
        if (newQty > maxQty) {
          toast.error(`Maksimal ${maxQty} untuk PO item ini`);
          return prev;
        }
        newPoItems[existingIndex] = { ...newPoItems[existingIndex], quantity: newQty };
      } else {
        if (1 > maxQty) {
          toast.error(`Maksimal ${maxQty} untuk PO item ini`);
          return prev;
        }
        newPoItems.push({ po_item_code: poItemCode, quantity: 1, purchase_price: purchasePrice });
      }
      
      newPoItems = newPoItems.filter(pi => pi.quantity > 0);
      const totalQty = newPoItems.reduce((sum, pi) => sum + pi.quantity, 0);
      
      return {
        ...prev,
        [productCode]: { po_items: newPoItems, total_qty: totalQty }
      };
    });
  };

  const removePOItem = (productCode: string, poItemCode: string) => {
    setSelectedItems(prev => {
      const current = prev[productCode];
      if (!current) return prev;
      const newPoItems = current.po_items.filter(pi => pi.po_item_code !== poItemCode);
      const totalQty = newPoItems.reduce((sum, pi) => sum + pi.quantity, 0);
      return {
        ...prev,
        [productCode]: { po_items: newPoItems, total_qty: totalQty }
      };
    });
  };

  const toggleProductExpand = (productCode: string) => {
    setExpandedProducts(prev => ({ ...prev, [productCode]: !prev[productCode] }));
  };

  const getTotalAmount = () => {
    let total = 0;
    for (const [productCode, sel] of Object.entries(selectedItems)) {
      const stockItem = availableStock.find(s => s.product_code === productCode);
      if (stockItem) {
        total += sel.total_qty * stockItem.unit_price;
      }
    }
    return total;
  };

  const buildPayload = () => {
    const items: any[] = [];
    for (const [productCode, sel] of Object.entries(selectedItems)) {
      if (sel.total_qty === 0) continue;
      const stockItem = availableStock.find(s => s.product_code === productCode);
      if (!stockItem) continue;
      
      items.push({
        product_code: productCode,
        po_items: sel.po_items.map(pi => ({
          po_item_code: pi.po_item_code,
          quantity: pi.quantity
        }))
      });
    }
    return {
      so_code: selectedSO!.so_code,
      items,
      courier: createForm.courier,
      tracking_number: createForm.tracking_number,
      shipping_date: createForm.shipping_date,
      shipping_cost: createForm.shipping_cost ? parseFloat(createForm.shipping_cost) : 0,
      notes: createForm.notes || null,
    };
  };

  const handleCreateDO = async () => {
    if (!selectedSO) {
      toast.error('Pilih Sales Order');
      return;
    }
    const totalItems = Object.values(selectedItems).reduce((sum, s) => sum + s.total_qty, 0);
    if (totalItems === 0) {
      toast.error('Pilih minimal 1 item untuk dikirim');
      return;
    }
    if (!createForm.courier) {
      toast.error('Kurir wajib diisi');
      return;
    }
    if (!createForm.tracking_number) {
      toast.error('Nomor resi wajib diisi');
      return;
    }

    setCreating(true);
    try {
      const payload = buildPayload();
      const res = await fetch('/api/deliver-to-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'Gagal membuat DO');

      toast.success(`Delivery Order ${d.data.do_code} berhasil dibuat`);
      setShowCreate(false);
      refetch();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // ── Confirm delivered handlers ──────────────────────────────────────────────
  const openConfirmModal = (doItem: DeliveryOrder) => {
    setConfirmDO(doItem);
    setDeliveredForm({
      delivered_date: new Date().toISOString().split('T')[0],
      delivered_by: '',
      notes: '',
    });
    setProofOfDelivery(null);
    setShowConfirmDelivered(true);
  };

  const handleConfirmDelivered = async () => {
    if (!confirmDO) return;
    if (!deliveredForm.delivered_by.trim()) {
      toast.error('Nama penerima wajib diisi');
      return;
    }

    setConfirming(true);
    try {
      const encodedDoCode = encodeURIComponent(confirmDO.do_code);

      const res = await fetch(`/api/deliver-to-client/${encodedDoCode}/delivered`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivered_date: deliveredForm.delivered_date,
          delivered_by: deliveredForm.delivered_by,
          notes: deliveredForm.notes || null,
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'Gagal konfirmasi');

      toast.success(`DO ${confirmDO.do_code} telah tersampaikan`);
      setShowConfirmDelivered(false);
      setConfirmDO(null);
      refetch();
      if (selectedDO?.do_code === confirmDO.do_code) setSelectedDO(null);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setConfirming(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 max-w-[1400px]">
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}`}</style>
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />

      {showConfirmDelivered && confirmDO && (
  <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
    <div className="bg-white rounded-2xl shadow-2xl w-[440px] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-[15px]">Konfirmasi Penerimaan</div>
        <button onClick={() => setShowConfirmDelivered(false)}>
          <X size={15} style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>
      <p className="text-[12.5px] mb-4">
        Konfirmasi bahwa <strong>{confirmDO.do_code}</strong> sudah sampai ke customer.
      </p>
      
      <div className="space-y-3">
        <div>
          <label className="input-label">Tanggal Sampai *</label>
          <input
            type="date"
            className="input"
            value={deliveredForm.delivered_date}
            onChange={(e) => setDeliveredForm(prev => ({ ...prev, delivered_date: e.target.value }))}
          />
        </div>
        <div>
          <label className="input-label">Nama Penerima *</label>
          <input
            className="input"
            placeholder="Nama orang yang menerima"
            value={deliveredForm.delivered_by}
            onChange={(e) => setDeliveredForm(prev => ({ ...prev, delivered_by: e.target.value }))}
          />
        </div>
        <div>
          <label className="input-label">Catatan (opsional)</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Catatan tambahan..."
            value={deliveredForm.notes}
            onChange={(e) => setDeliveredForm(prev => ({ ...prev, notes: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex gap-2 mt-5 justify-end">
        <button className="btn btn-outline btn-sm" onClick={() => setShowConfirmDelivered(false)}>Batal</button>
        <button
          className="btn btn-sm"
          style={{ background: '#059669', color: '#fff', border: 'none' }}
          onClick={handleConfirmDelivered}
          disabled={!deliveredForm.delivered_by.trim()}
        >
          {confirming ? 'Memproses...' : 'Sampaikan'}
        </button>
      </div>
    </div>
  </div>
)}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Delivery Order</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {stats.totalDO} total · {stats.shipping} pengiriman · {stats.delivered} tersampaikan
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
          <Plus size={13} /> Buat DO
        </button>
      </div>

      {/* Filter Card */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              placeholder="Cari DO, SO, customer..."
              value={searchLocal}
              onChange={e => handleSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div>
            <select className="input" value={statusFilter} onChange={e => handleStatusFilter(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="shipping">Pengiriman</option>
              <option value="delivered">Tersampaikan</option>
              <option value="cancelled">Batal</option>
            </select>
          </div>
          <div>
            <label className="input-label text-[11px]">Dari</label>
            <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="input-label text-[11px]">Sampai</label>
            <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={applyFilters}>Cari</button>
          <button className="btn btn-outline btn-sm" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kode DO</th>
                <th>SO</th>
                <th>Customer</th>
                <th>PO Count</th>
                <th>Kurir</th>
                <th>No. Resi</th>
                <th>Status</th>
                <th>Tgl Kirim</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <Loader2 size={16} className="inline animate-spin mr-2" /> Memuat...
                  </td>
                </tr>
              )}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Truck size={28} style={{ color: 'var(--color-border)' }} />
                      <div className="text-[13px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        {searchLocal || statusFilter || dateFrom || dateTo ? 'Tidak ada DO yang cocok' : 'Belum ada Delivery Order'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {data.map(doItem => {
                const st = DO_STATUS[doItem.status] || { label: doItem.status, color: 'gray' };
                const canDeliver = doItem.status === 'shipping';
                return (
                  <tr key={doItem.id || doItem.do_code}>
                    <td><span className="tbl-mono" style={{ color: '#7c3aed' }}>{doItem.do_code}</span></td>
                    <td style={{ color: '#7c3aed' }}>{doItem.so_code}</td>
                    <td className="font-medium text-[13px]">{doItem.so_customer_name || '-'}</td>
                    <td><span className="badge badge-purple">{doItem.po_count || 0} PO</span></td>
                    <td>{doItem.courier || '-'}</td>
                    <td className="font-mono text-[11px]">{doItem.tracking_number || '-'}</td>
                    <td><span className={`badge badge-${st.color}`}>{st.label}</span></td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(doItem.shipping_date)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-outline btn-icon btn-sm"
                          onClick={() => {
                            setSelectedDO(doItem);
                            fetchDetail(doItem.do_code);
                          }}
                          title="Detail"
                        >
                          <Eye size={13} />
                        </button>
                        {canDeliver && (
                          <button
                            className="btn btn-sm flex items-center gap-1"
                            style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}
                            onClick={() => openConfirmModal(doItem)}
                          >
                            <CheckCircle2 size={12} /> Sampaikan
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
        <Pagination meta={meta} setPage={setPage} setLimit={(l) => { setLimit(l); setPage(1); }} />
      </div>

      {/* Detail Drawer */}
      {selectedDO && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setSelectedDO(null)}>
          <div className="bg-white h-full w-[480px] shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div>
                <div className="font-bold text-[15px]">Detail DO</div>
                <div className="font-mono text-[12px] mt-0.5" style={{ color: '#7c3aed' }}>{selectedDO.do_code}</div>
              </div>
              <button className="btn btn-outline btn-icon btn-sm" onClick={() => setSelectedDO(null)}><X size={14} /></button>
            </div>
            {detailLoading ? (
              <div className="p-5 text-center py-16">Memuat...</div>
            ) : detailData ? (
              <div className="p-5 space-y-4">
                <div className="pb-4 border-b">
                  <span className={`badge badge-${DO_STATUS[detailData.status]?.color || 'gray'}`}>
                    {DO_STATUS[detailData.status]?.label || detailData.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['SO', detailData.so_code],
                    ['Customer', detailData.customer_name || '-'],
                    ['Kurir', detailData.courier || '-'],
                    ['No. Resi', detailData.tracking_number || '-'],
                    ['Tgl Kirim', formatDate(detailData.shipping_date)],
                    ['Ongkos Kirim', formatRupiah(detailData.shipping_cost || 0)],
                    detailData.delivered_date && ['Tgl Sampai', formatDate(detailData.delivered_date)],
                    detailData.delivered_by && ['Diterima Oleh', detailData.delivered_by],
                  ].filter(Boolean).map(([l, v]) => (
                    <div key={l as string}>
                      <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{l}</div>
                      <div className="text-[13px] font-medium">{v as string}</div>
                    </div>
                  ))}
                </div>
                {detailData.notes && <div><div className="text-[11px] mb-1">Catatan</div><div className="p-2 rounded bg-gray-50">{detailData.notes}</div></div>}
              </div>
            ) : (
              <div className="p-5 text-center">Data tidak ditemukan</div>
            )}
          </div>
        </div>
      )}

      {/* Create DO Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl w-[1100px] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10 rounded-t-xl">
              <h2 className="font-bold text-[15px]">Buat Delivery Order</h2>
              <button className="btn btn-outline btn-icon btn-sm" onClick={() => setShowCreate(false)}><X size={14} /></button>
            </div>

            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Pilih SO */}
              <div>
                <label className="input-label">Sales Order *</label>
                <select
                  className="input"
                  value={selectedSO?.so_code || ''}
                  onChange={e => handleSOChange(e.target.value)}
                >
                  <option value="">Pilih SO (status processing)</option>
                  {soList.map(so => (
                    <option key={so.so_code} value={so.so_code}>
                      {so.so_code} – {so.customer_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock & Item Selection */}
              {selectedSO && (
                <div className="border rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b font-semibold text-sm">
                    Pilih Item & PO Sumber
                  </div>
                  {loadingStock ? (
                    <div className="p-6 text-center"><Loader2 className="animate-spin inline mr-2" size={16} /> Memuat stok...</div>
                  ) : availableStock.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">Tidak ada stok tersedia dari PO yang sudah paid</div>
                  ) : (
                    <div className="divide-y">
                      {availableStock.map(item => {
                        const isExpanded = expandedProducts[item.product_code];
                        const selected = selectedItems[item.product_code];
                        const selectedQty = selected?.total_qty || 0;
                        return (
                          <div key={item.product_code}>
                            <div
                              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                              onClick={() => toggleProductExpand(item.product_code)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-6 text-gray-400">
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>
                                <div>
                                  <div className="font-medium">{item.product_name}</div>
                                  <div className="text-xs text-gray-500">
                                    SO: {item.remaining_to_ship} tersisa | Harga jual: {formatRupiah(item.unit_price)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-semibold">{selectedQty} / {item.remaining_to_ship}</span>
                                {selectedQty > 0 && (
                                  <span className="text-xs text-purple-600">+{formatRupiah(selectedQty * item.unit_price)}</span>
                                )}
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="px-4 pb-3 pt-1 bg-gray-50">
                                <div className="text-xs font-medium mb-2">Pilih dari PO:</div>
                                <div className="space-y-2">
                                  {item.po_items.map(po => {
                                    const existing = selected?.po_items.find(p => p.po_item_code === po.po_item_code);
                                    const qty = existing?.quantity || 0;
                                    return (
                                      <div key={po.po_item_code} className="flex items-center justify-between border-b pb-2">
                                        <div>
                                          <div className="text-sm">PO {po.po_code} - {po.supplier_name}</div>
                                          <div className="text-xs text-gray-500">
                                            Stok tersedia: {po.available_qty} | Harga beli: {formatRupiah(po.purchase_price)}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            className="btn btn-outline btn-icon btn-sm"
                                            onClick={() => updatePOItemQuantity(item.product_code, po.po_item_code, po.available_qty, po.purchase_price)}
                                            disabled={qty >= po.available_qty}
                                          >
                                            <Plus size={12} />
                                          </button>
                                          <span className="w-8 text-center">{qty}</span>
                                          <button
                                            type="button"
                                            className="btn btn-outline btn-icon btn-sm text-red-500"
                                            onClick={() => removePOItem(item.product_code, po.po_item_code)}
                                            disabled={qty === 0}
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Ringkasan */}
              {selectedSO && getTotalAmount() > 0 && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 flex justify-between">
                  <span className="font-semibold">Total Nilai DO:</span>
                  <span className="font-bold text-purple-700">{formatRupiah(getTotalAmount())}</span>
                </div>
              )}

              {/* Form Pengiriman */}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Kurir *</label><select className="input" value={createForm.courier} onChange={e => setCreateForm(p => ({ ...p, courier: e.target.value }))}><option value="">Pilih</option>{COURIERS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="input-label">No. Resi *</label><input className="input" value={createForm.tracking_number} onChange={e => setCreateForm(p => ({ ...p, tracking_number: e.target.value }))} /></div>
                <div><label className="input-label">Tgl Kirim *</label><input type="date" className="input" value={createForm.shipping_date} onChange={e => setCreateForm(p => ({ ...p, shipping_date: e.target.value }))} /></div>
                <div><label className="input-label">Ongkos Kirim</label><input type="number" className="input" value={createForm.shipping_cost} onChange={e => setCreateForm(p => ({ ...p, shipping_cost: e.target.value }))} /></div>
              </div>
              <div><label className="input-label">Catatan</label><textarea className="input resize-none" rows={2} value={createForm.notes} onChange={e => setCreateForm(p => ({ ...p, notes: e.target.value }))} /></div>

              {/* Upload Bukti Pengiriman */}
              <div className="border rounded-xl p-4">
                <label className="input-label block mb-2">Bukti Pengiriman (opsional)</label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50" onClick={() => fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setShippingProof(e.target.files?.[0] || null)} />
                  {shippingProof ? <div className="flex items-center justify-center gap-2"><FileText size={16} /><span>{shippingProof.name}</span><button onClick={e => { e.stopPropagation(); setShippingProof(null); }}><X size={14} /></button></div> : <><Upload size={24} className="mx-auto mb-2 text-gray-400" /><div className="text-sm">Klik untuk upload</div></>}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t">
              <button className="btn btn-outline btn-sm" onClick={() => setShowCreate(false)}>Batal</button>
              <button className="btn btn-primary btn-sm" onClick={handleCreateDO} disabled={creating || !selectedSO || getTotalAmount() === 0 || !createForm.courier || !createForm.tracking_number}>
                {creating ? <><Loader2 size={13} className="animate-spin" /> Menyimpan...</> : 'Buat DO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}