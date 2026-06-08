'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePaginated, useDebounce } from '@/hooks/useApi';
import { formatRupiah, formatDate } from '@/lib/utils';
import {
  Plus, Search, Eye, X, Upload, Trash2,
  FileText, CreditCard, Package, ShoppingCart, Loader2, CheckCircle2,
  AlertCircle, Info, ChevronDown, Building2,
} from 'lucide-react';
import Pagination from '@/components/Pagination';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PO {
  id: number;
  po_code: string;
  so_code: string;
  supplier_code?: string;
  supplier_name: string;
  total_amount: number;
  tax_amount: number;
  tax_configuration: string;
  status: string;
  notes: string;
  item_count?: number;
  created_at: string;
  items?: POItem[];
  attachments?: any[];
  payments?: POPayment[];
  so?: any;
}

interface POItem {
  id: number;
  po_item_code?: string;
  poi_code?: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price?: number;
  purchase_price?: number;
  subtotal?: number;
}

interface POPayment {
  payment_code: string;
  po_code: string;
  supplier_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  bank_name?: string;
  account_number?: string;
  reference_number: string;
  notes?: string;
  status: string;
  created_at: string;
}

interface SO {
  so_code: string;
  customer_code: string;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  status: string;
  items?: SOItem[];
  po_count?: number;
  created_at?: string;
}

interface SOItem {
  so_item_code: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface SOItemWithRemaining extends SOItem {
  remaining: number;
  existingPOs: PO[];
}

interface Supplier {
  supplier_code: string;
  supplier_name: string;
  contact_person?: string;
  phone?: string;
  bank_name?: string;
  account_number?: string;
}

interface CompanyBank {
  account_code: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  branch?: string;
  company_code?: string;
  company_name?: string;
}

interface POFormData {
  id: string;
  so_item_code: string;
  product_code: string;
  product_name: string;
  so_quantity: number;
  so_unit_price: number;
  remaining: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string;
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
  open, title, message, confirmLabel = 'Hapus', onConfirm, onCancel,
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

const PO_STATUS: Record<string, { label: string; color: string }> = {
  submitted:    { label: 'Submitted',    color: 'blue'   },
  approved_spv: { label: 'Approved SPV', color: 'yellow' },
  approved:     { label: 'Approved',     color: 'green'  },
  rejected:     { label: 'Rejected',     color: 'red'    },
  paid:         { label: 'Paid',         color: 'purple' },
  cancelled:    { label: 'Cancelled',    color: 'gray'   },
};

const SO_STATUS: Record<string, { label: string; color: string }> = {
  submitted:  { label: 'Submitted',  color: 'blue'   },
  processing: { label: 'Processing', color: 'yellow' },
  invoicing:  { label: 'Invoicing',  color: 'purple' },
  completed:  { label: 'Completed',  color: 'green'  },
  cancelled:  { label: 'Cancelled',  color: 'gray'   },
};

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];
type ActiveTab = 'so' | 'po' | 'payment';

// ─── Helper Functions ─────────────────────────────────────────────────────────

const getItemPrice   = (item: any): number => item.unit_price || item.purchase_price || 0;
const getItemSubtotal = (item: any): number => item.subtotal || (item.quantity * getItemPrice(item));

// ─── Stepper wizard for Create PO ────────────────────────────────────────────

const STEPS = ['Pilih SO & Supplier', 'Tambah Item', 'Pajak & Dokumen'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-5">
      {STEPS.map((label, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all"
                style={{
                  background: done ? '#7c3aed' : active ? '#7c3aed' : 'var(--color-border)',
                  color: done || active ? '#fff' : 'var(--color-text-muted)',
                }}
              >
                {done ? <CheckCircle2 size={13} /> : i + 1}
              </div>
              <span className="text-[12px] font-medium hidden sm:block" style={{ color: active ? '#7c3aed' : done ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-3" style={{ background: done ? '#7c3aed' : 'var(--color-border)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PurchaseOrderPage() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>('so');

  const { data: poData, meta, loading: poLoading, refetch, setSearch: setPOSearch, setPage, setLimit } = usePaginated<PO>('/api/purchase-orders');
  const [poSearch, setPOSearchLocal] = useState('');
  const debouncedPOSearch = useDebounce(poSearch, 400);
  useEffect(() => { setPOSearch(debouncedPOSearch); }, [debouncedPOSearch]);

  const [salesOrders, setSalesOrders] = useState<SO[]>([]);
  const [soSearch, setSOSearch] = useState('');
  const [soLoading, setSOLoading] = useState(false);

  const [allPayments, setAllPayments] = useState<POPayment[]>([]);
  const [paymentSearch, setPaymentSearch] = useState('');

  const [poStatusFilter, setPoStatusFilter] = useState('');
  const [poDateFrom, setPoDateFrom] = useState('');
  const [poDateTo, setPoDateTo] = useState('');

  const [soStatusFilter, setSoStatusFilter] = useState('');
  const [soDateFrom, setSoDateFrom] = useState('');
  const [soDateTo, setSoDateTo] = useState('');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companyBanks, setCompanyBanks] = useState<CompanyBank[]>([]);

  const [stats, setStats] = useState({ totalSO: 0, totalPO: 0, totalPayments: 0 });

  const [selectedPO, setSelectedPO] = useState<PO | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create PO
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [selectedSO, setSelectedSO] = useState<SO | null>(null);
  const [selectedSupplierCode, setSelectedSupplierCode] = useState('');
  const [soItemsLoading, setSoItemsLoading] = useState(false);
  const [selectedSOItems, setSelectedSOItems] = useState<SOItemWithRemaining[]>([]);
  const [existingPOs, setExistingPOs] = useState<PO[]>([]);
  const [poForms, setPoForms] = useState<POFormData[]>([]);
  const [poDocument, setPoDocument] = useState<File | null>(null);
  const [poDocNotes, setPoDocNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const poFileRef = useRef<HTMLInputElement>(null);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [poTaxType, setPoTaxType] = useState('percentage');
  const [poTaxValue, setPoTaxValue] = useState(0);

  // Payment
  const [showPayment, setShowPayment] = useState(false);
  const [paymentPO, setPaymentPO] = useState<PO | null>(null);
  const [paymentFiles, setPaymentFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'transfer',
    company_bank_code: '',
    bank_name: '',
    account_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: '',
  });
  const payFileRef = useRef<HTMLInputElement>(null);

  // ── Initial fetches ────────────────────────────────────────────────────────

  useEffect(() => { fetchSalesOrders(); fetchSuppliersAndBanks(); }, []);

  useEffect(() => {
    const pays = poData.flatMap(po => po.payments || []);
    setAllPayments(pays);
    setStats(prev => ({ ...prev, totalPO: meta.total || 0, totalPayments: pays.length }));
  }, [poData, meta.total]);

  const fetchSalesOrders = async () => {
    setSOLoading(true);
    try {
      const res = await fetch('/api/sales-orders?limit=200');
      const d = await res.json();
      if (d.success) {
        setSalesOrders(d.data || []);
        setStats(prev => ({ ...prev, totalSO: (d.data || []).length }));
      }
    } catch { /* silent */ } finally { setSOLoading(false); }
  };

  const fetchSuppliersAndBanks = async () => {
    try {
      const [sRes, bRes] = await Promise.all([
        fetch('/api/purchase-orders?endpoint=suppliers'),
        fetch('/api/purchase-orders?endpoint=bank-accounts'),
      ]);
      const sData = await sRes.json();
      const bData = await bRes.json();
      if (sData.success) setSuppliers(sData.data || []);
      if (bData.success) setCompanyBanks(bData.data || []);
    } catch { /* silent */ }
  };

  // ── PO Detail ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (selectedPO?.po_code) {
      setDetailLoading(true);
      fetch(`/api/purchase-orders?po_code=${encodeURIComponent(selectedPO.po_code)}`)
        .then(r => r.json())
        .then(d => setDetailData(d.success ? d.data : null))
        .catch(() => setDetailData(null))
        .finally(() => setDetailLoading(false));
    } else setDetailData(null);
  }, [selectedPO?.po_code]);

  // ── Fetch Existing POs ─────────────────────────────────────────────────────

  const fetchExistingPOs = async (soCode: string): Promise<PO[]> => {
    try {
      const res = await fetch(`/api/purchase-orders?so_code=${encodeURIComponent(soCode)}`);
      const d = await res.json();
      if (!d.success) return [];
      const posWithItems = await Promise.all(
        (d.data || []).map(async (po: PO) => {
          const dr = await fetch(`/api/purchase-orders?po_code=${encodeURIComponent(po.po_code)}`);
          const dd = await dr.json();
          return dd.success ? dd.data : po;
        })
      );
      return posWithItems;
    } catch { return []; }
  };

  const openPODetail = (poCode: string) => {
    const po = poData.find(p => p.po_code === poCode);
    if (po) setSelectedPO(po); else setSelectedPO({ po_code: poCode } as PO);
  };

  // ── SO selection ───────────────────────────────────────────────────────────

  const handleSelectSO = async (soCode: string) => {
    if (!soCode) { setSelectedSO(null); setSelectedSOItems([]); setExistingPOs([]); setPoForms([]); return; }
    const so = salesOrders.find(s => s.so_code === soCode) || null;
    setSelectedSO(so);
    setPoForms([]);
    if (so) {
      setSoItemsLoading(true);
      try {
        const pos = await fetchExistingPOs(soCode);
        setExistingPOs(pos);
        setSelectedSOItems(
          (so.items || []).map(item => {
            const existingQty = pos
              .filter(po => po.status !== 'rejected' && po.status !== 'cancelled')
              .flatMap(po => po.items || [])
              .filter(pi => pi.product_code === item.product_code)
              .reduce((s, pi) => s + (pi.quantity || 0), 0);
            return {
              ...item,
              remaining: Math.max(0, item.quantity - existingQty),
              existingPOs: pos.filter(po => (po.items || []).some(pi => pi.product_code === item.product_code)),
            };
          })
        );
      } finally { setSoItemsLoading(false); }
    }
  };

  // ── Quantity helpers ───────────────────────────────────────────────────────

  const getExistingPOQty = (productCode: string): number =>
    existingPOs
      .filter(po => po.status !== 'rejected' && po.status !== 'cancelled')
      .flatMap(po => po.items || [])
      .filter(i => i.product_code === productCode)
      .reduce((s, i) => s + (i.quantity || 0), 0);

  const getAvailableQty = (productCode: string, soQty: number, excludeFormId?: string): number => {
    const existingQty = getExistingPOQty(productCode);
    const otherQty = poForms
      .filter(f => f.product_code === productCode && f.id !== excludeFormId)
      .reduce((s, f) => s + f.quantity, 0);
    return Math.max(0, soQty - existingQty - otherQty);
  };

  // ── PO forms ───────────────────────────────────────────────────────────────

  const addPOForm = (item: SOItemWithRemaining) => {
    setPoForms(prev => {
      const existing = prev.find(f => f.product_code === item.product_code);
      if (existing) {
        return prev.map(f => {
          if (f.product_code === item.product_code) {
            const newQty = f.quantity + 1;
            return { ...f, quantity: newQty, subtotal: newQty * f.unit_price };
          }
          return f;
        });
      }

      const otherQty = prev.filter(f => f.product_code === item.product_code).reduce((s, f) => s + f.quantity, 0);
      const existingQty = getExistingPOQty(item.product_code);
      const avail = Math.max(0, item.quantity - existingQty - otherQty);
      if (avail <= 0) return prev;

      const newForm: POFormData = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        so_item_code: item.so_item_code,
        product_code: item.product_code,
        product_name: item.product_name,
        so_quantity: item.quantity,
        so_unit_price: item.unit_price,
        remaining: avail,
        quantity: 1,
        unit_price: 0,
        subtotal: 0,
        notes: '',
      };
      return [...prev, newForm];
    });
  };

  const removePOForm = (productCode: string) => {
    setPoForms(prev => prev.filter(f => f.product_code !== productCode));
    setConfirmDelete(null);
  };

  const updatePOForm = (productCode: string, field: 'quantity' | 'unit_price' | 'notes', value: any) => {
    setPoForms(prev => prev.map(f => {
      if (f.product_code !== productCode) return f;
      const updated = { ...f, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        updated.subtotal = updated.quantity * updated.unit_price;
      }
      return updated;
    }));
  };

  // ── Kalkulasi ──────────────────────────────────────────────────────────────

  const totalAllForms = poForms.reduce((s, f) => s + f.subtotal, 0);
  const calculatedTaxAmount = poTaxType === 'percentage' ? totalAllForms * poTaxValue / 100 : poTaxValue;
  const grandTotal = totalAllForms + calculatedTaxAmount;

  const canCreatePOForSO = (so: SO): boolean => {
    if (so.status === 'cancelled' || so.status === 'completed') return false;
    if (!so.items || so.items.length === 0) return true;
    return so.items.some(item => {
      const existingQty = poData
        .filter(po => po.so_code === so.so_code && po.status !== 'rejected' && po.status !== 'cancelled')
        .flatMap(po => po.items || [])
        .filter(pi => pi.product_code === item.product_code)
        .reduce((s, pi) => s + pi.quantity, 0);
      return item.quantity - existingQty > 0;
    });
  };

  // ── Wizard ─────────────────────────────────────────────────────────────────

  const goNextStep = () => {
    if (createStep === 0) {
      if (!selectedSO) { toast.error('Pilih Sales Order terlebih dahulu'); return; }
      if (!selectedSupplierCode) { toast.error('Pilih Supplier terlebih dahulu'); return; }
    }
    if (createStep === 1 && poForms.length === 0) { toast.error('Tambahkan minimal 1 item PO'); return; }
    if (createStep === 1) {
      const invalid = poForms.find(f => f.quantity <= 0 || f.unit_price <= 0);
      if (invalid) { toast.error(`Lengkapi quantity dan harga untuk "${invalid.product_name}"`); return; }
    }
    setCreateStep(s => s + 1);
  };

  // ── Create PO ──────────────────────────────────────────────────────────────

  const handleCreatePO = async () => {
    if (!selectedSO) { toast.error('Pilih Sales Order terlebih dahulu'); return; }
    if (!selectedSupplierCode) { toast.error('Pilih Supplier terlebih dahulu'); return; }
    if (poForms.length === 0) { toast.error('Tambahkan minimal 1 item PO'); return; }

    const invalid = poForms.find(f => f.quantity <= 0 || f.unit_price <= 0);
    if (invalid) { toast.error(`Lengkapi quantity dan harga untuk "${invalid.product_name}"`); return; }

    for (const f of poForms) {
      const maxAllowed = getAvailableQty(f.product_code, f.so_quantity, f.id) + f.quantity;
      if (f.quantity > maxAllowed) {
        toast.error(`Quantity untuk ${f.product_name} melebihi sisa (${maxAllowed})`);
        return;
      }
    }

    setCreating(true);
    try {
      const poPayload = {
        so_code: selectedSO.so_code,
        supplier_code: selectedSupplierCode,
        total_amount: grandTotal,
        tax_amount: calculatedTaxAmount,
        tax_configuration: poTaxType,
        notes: poForms.map(f => f.notes).filter(Boolean).join(', ') || null,
        items: poForms.map(f => ({
          product_code: f.product_code,
          product_name: f.product_name,
          quantity: f.quantity,
          unit_price: f.unit_price,
          subtotal: f.subtotal,
        })),
      };

      const fd = new FormData();
      fd.append('data', JSON.stringify(poPayload));
      if (poDocument) fd.append('po_document', poDocument);

      const res = await fetch('/api/purchase-orders', { method: 'POST', body: fd });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'Gagal membuat PO');

      toast.success('Purchase Order berhasil dibuat!');
      closeCreate();
      refetch();
      fetchSalesOrders();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally { setCreating(false); }
  };

  const closeCreate = () => {
    setShowCreate(false);
    setCreateStep(0);
    setSelectedSO(null);
    setSelectedSupplierCode('');
    setSelectedSOItems([]);
    setExistingPOs([]);
    setPoForms([]);
    setPoDocument(null);
    setPoDocNotes('');
    setPoTaxType('percentage');
    setPoTaxValue(0);
  };

  // ── Payment ────────────────────────────────────────────────────────────────

  const openPayment = (po: PO) => {
    setPaymentPO(po);
    setPaymentFiles([]);
    setPaymentForm({
      payment_method: 'transfer',
      company_bank_code: '',
      bank_name: '',
      account_number: '',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: '',
    });
    setShowPayment(true);
  };

  const handlePayment = async () => {
    if (!paymentPO) return;
    if (!paymentForm.reference_number.trim()) { toast.error('Nomor referensi wajib diisi'); return; }
    if (paymentForm.payment_method === 'transfer') {
      if (!paymentForm.company_bank_code) { toast.error('Pilih rekening perusahaan'); return; }
      if (!paymentForm.bank_name) { toast.error('Pilih bank supplier'); return; }
      if (!paymentForm.account_number.trim()) { toast.error('Nomor rekening supplier wajib diisi'); return; }
    }
    if (paymentFiles.length === 0) { toast.error('Upload minimal 1 dokumen pembayaran'); return; }

    setPaying(true);
    try {
      const fd = new FormData();
      const payload = {
        po_code: paymentPO.po_code,
        amount: paymentPO.total_amount,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        bank_name: paymentForm.bank_name || null,
        account_number: paymentForm.account_number || null,
        reference_number: paymentForm.reference_number,
        notes: paymentForm.notes || null,
        supplier_name: paymentPO.supplier_name,
        company_bank_code: paymentForm.company_bank_code || null, // ✅ kirim company_bank_code
      };
      fd.append('data', JSON.stringify(payload));
      paymentFiles.forEach(f => fd.append('files', f));

      const res = await fetch('/api/purchase-orders', { method: 'PUT', body: fd });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'Gagal membuat pembayaran');

      toast.success(`Pembayaran ${d.payment_code} berhasil dibuat!`);
      setShowPayment(false);
      setPaymentPO(null);
      refetch();
      fetchSalesOrders();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally { setPaying(false); }
  };

  // ── Filtered data ──────────────────────────────────────────────────────────

  const hasActiveSOFilter = !!(soSearch || soStatusFilter || soDateFrom || soDateTo);
  const hasActivePOFilter = !!(poSearch || poStatusFilter || poDateFrom || poDateTo);

  const filteredSO = salesOrders.filter(so => {
    const s = soSearch.toLowerCase();
    if (s && !so.so_code.toLowerCase().includes(s) && !(so.customer_name || '').toLowerCase().includes(s)) return false;
    if (soStatusFilter && so.status !== soStatusFilter) return false;
    if (soDateFrom && so.created_at && so.created_at < soDateFrom) return false;
    if (soDateTo && so.created_at && so.created_at > soDateTo + 'T23:59:59') return false;
    return true;
  });

  const filteredPO = poData.filter(po => {
    if (poStatusFilter && po.status !== poStatusFilter) return false;
    if (poDateFrom && po.created_at < poDateFrom) return false;
    if (poDateTo && po.created_at > poDateTo + 'T23:59:59') return false;
    return true;
  });

  const filteredPayments = allPayments.filter(p => {
    const s = paymentSearch.toLowerCase();
    if (s && !p.payment_code?.toLowerCase().includes(s) && !p.po_code?.toLowerCase().includes(s) && !p.supplier_name?.toLowerCase().includes(s)) return false;
    return true;
  });

  const tabBtn = (tab: ActiveTab, label: string) => (
    <button
      className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-[#7c3aed] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]'}`}
      onClick={() => setActiveTab(tab)}
    >{label}</button>
  );

  const resetAllFilters = () => {
    setPOSearchLocal(''); setPOSearch(''); setSOSearch(''); setPaymentSearch('');
    setPoStatusFilter(''); setPoDateFrom(''); setPoDateTo('');
    setSoStatusFilter(''); setSoDateFrom(''); setSoDateTo('');
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-[1400px]">
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}`}</style>
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Hapus Item PO?"
        message="Data yang sudah diisi akan hilang. Lanjutkan?"
        confirmLabel="Hapus"
        onConfirm={() => confirmDelete && removePOForm(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Purchase Order</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {stats.totalSO} SO · {stats.totalPO} PO · {stats.totalPayments} Pembayaran
          </p>
        </div>
        {activeTab === 'so' && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> Buat PO
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Sales Orders', value: stats.totalSO, icon: <ShoppingCart size={16} />, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Purchase Orders', value: stats.totalPO, icon: <Package size={16} />, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Pembayaran', value: stats.totalPayments, icon: <CreditCard size={16} />, color: '#059669', bg: '#ecfdf5' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div><div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div><div className="text-[20px] font-bold" style={{ color: 'var(--color-text)' }}>{s.value}</div></div>
          </div>
        ))}
      </div>

      {/* Filter Card */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--color-bg)' }}>
            {tabBtn('so', 'Sales Orders')}{tabBtn('po', 'Purchase Orders')}{tabBtn('payment', 'Pembayaran')}
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input className="input" style={{ paddingLeft: 32 }}
              placeholder={activeTab === 'so' ? 'Cari SO, customer...' : activeTab === 'po' ? 'Cari PO, supplier...' : 'Cari pembayaran...'}
              value={activeTab === 'so' ? soSearch : activeTab === 'po' ? poSearch : paymentSearch}
              onChange={e => { if (activeTab === 'so') setSOSearch(e.target.value); else if (activeTab === 'po') { setPOSearchLocal(e.target.value); } else setPaymentSearch(e.target.value); }}
            />
          </div>
          {(activeTab === 'so' || activeTab === 'po') && (
            <div>
              <select className="input" value={activeTab === 'so' ? soStatusFilter : poStatusFilter}
                onChange={e => activeTab === 'so' ? setSoStatusFilter(e.target.value) : setPoStatusFilter(e.target.value)}>
                <option value="">Semua Status</option>
                {activeTab === 'so' ? (
                  ['submitted','processing','invoicing','completed','cancelled'].map(s => <option key={s} value={s}>{SO_STATUS[s]?.label || s}</option>)
                ) : (
                  ['submitted','approved_spv','approved','paid','rejected','cancelled'].map(s => <option key={s} value={s}>{PO_STATUS[s]?.label || s}</option>)
                )}
              </select>
            </div>
          )}
          {(activeTab === 'so' || activeTab === 'po') && (
            <>
              <div><input type="date" className="input" value={activeTab === 'so' ? soDateFrom : poDateFrom} onChange={e => activeTab === 'so' ? setSoDateFrom(e.target.value) : setPoDateFrom(e.target.value)} /></div>
              <div><input type="date" className="input" value={activeTab === 'so' ? soDateTo : poDateTo} onChange={e => activeTab === 'so' ? setSoDateTo(e.target.value) : setPoDateTo(e.target.value)} /></div>
            </>
          )}
          <button className="btn btn-outline btn-sm" onClick={resetAllFilters}>Reset</button>
        </div>
      </div>

      {/* TAB: SO */}
      {activeTab === 'so' && (
        <div className="card overflow-hidden">
          <div className="tbl-wrapper"><table className="tbl">
            <thead><tr><th>Kode SO</th><th>Customer</th><th>Tgl Dibuat</th><th>Item</th><th className="text-right">Total</th><th>Status</th><th>PO Count</th><th></th></tr></thead>
            <tbody>
              {soLoading && <tr><td colSpan={8} className="text-center py-8"><Loader2 size={16} className="inline animate-spin mr-2" />Memuat...</td></tr>}
              {!soLoading && filteredSO.length === 0 && (
                <tr><td colSpan={8} className="py-12"><div className="flex flex-col items-center gap-2"><ShoppingCart size={28} style={{ color: 'var(--color-border)' }} /><div className="text-[13px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{hasActiveSOFilter ? 'Tidak ada SO yang cocok' : 'Tidak ada data'}</div>{hasActiveSOFilter && <button className="btn btn-outline btn-sm mt-1" onClick={resetAllFilters}>Reset Filter</button>}</div></td></tr>
              )}
              {filteredSO.map(so => {
                const st = SO_STATUS[so.status] ?? { label: so.status, color: 'gray' };
                const canCreate = canCreatePOForSO(so);
                return (
                  <tr key={so.so_code}>
                    <td><span className="tbl-mono" style={{ color: '#7c3aed' }}>{so.so_code}</span></td>
                    <td><div className="font-medium text-[13px]">{so.customer_name || '-'}</div><div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{so.customer_phone || ''}</div></td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(so.created_at || '')}</td>
                    <td className="text-[12px]">{so.items?.length || 0} item</td>
                    <td className="text-right font-semibold">{formatRupiah(so.total_amount)}</td>
                    <td><span className={`badge badge-${st.color}`}>{st.label}</span></td>
                    <td><span className={`badge ${(so.po_count || 0) > 0 ? 'badge-purple' : 'badge-gray'}`}>{so.po_count || 0} PO</span></td>
                    <td>
                      <button className="btn btn-sm" disabled={!canCreate}
                        onClick={() => { handleSelectSO(so.so_code); setShowCreate(true); }}
                        style={canCreate ? {} : { background: 'var(--color-border)', color: 'var(--color-text-muted)', cursor: 'not-allowed', opacity: 0.6 }}>
                        <Plus size={12} /> Buat PO
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}

      {/* TAB: PO */}
      {activeTab === 'po' && (
        <div className="card overflow-hidden">
          <div className="tbl-wrapper"><table className="tbl">
            <thead><tr><th>Kode PO</th><th>SO</th><th>Supplier</th><th>Item</th><th className="text-right">Total</th><th>Status</th><th>Tgl Dibuat</th><th></th></tr></thead>
            <tbody>
              {poLoading && <tr><td colSpan={8} className="text-center py-8"><Loader2 size={16} className="inline animate-spin mr-2" />Memuat...</td></tr>}
              {!poLoading && filteredPO.length === 0 && (
                <tr><td colSpan={8} className="py-12"><div className="flex flex-col items-center gap-2"><Package size={28} style={{ color: 'var(--color-border)' }} /><div className="text-[13px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{hasActivePOFilter ? 'Tidak ada PO yang cocok' : 'Tidak ada data'}</div>{hasActivePOFilter && <button className="btn btn-outline btn-sm mt-1" onClick={resetAllFilters}>Reset Filter</button>}</div></td></tr>
              )}
              {filteredPO.map(po => {
                const st = PO_STATUS[po.status] ?? { label: po.status, color: 'gray' };
                const firstItem = po.items?.[0];
                const canPay = po.status === 'approved';
                return (
                  <tr key={po.id || po.po_code}>
                    <td><span className="tbl-mono">{po.po_code}</span></td>
                    <td style={{ color: '#7c3aed' }}>{po.so_code || '-'}</td>
                    <td className="font-medium">{po.supplier_name}</td>
                    <td>{firstItem ? <div><div className="text-[12px]">{firstItem.product_name}</div><div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Qty: {firstItem.quantity} · {formatRupiah(getItemPrice(firstItem))}</div></div> : <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>{po.item_count || 0} item</span>}</td>
                    <td className="text-right font-semibold">{formatRupiah(po.total_amount)}{po.tax_amount > 0 && <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Tax: {formatRupiah(po.tax_amount)}</div>}</td>
                    <td><span className={`badge badge-${st.color}`}>{st.label}</span></td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(po.created_at)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-outline btn-icon btn-sm" onClick={() => setSelectedPO(po)} title="Detail"><Eye size={13} /></button>
                        <button className="btn btn-primary btn-icon btn-sm" onClick={() => openPayment(po)} disabled={!canPay} title={!canPay ? 'PO harus di-approve' : 'Bayar'} style={canPay ? {} : { opacity: 0.4, cursor: 'not-allowed' }}><CreditCard size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
          <Pagination meta={meta} setPage={setPage} setLimit={(l) => { setLimit(l); setPage(1); }} />
        </div>
      )}

      {/* TAB: Payments */}
      {activeTab === 'payment' && (
        <div className="card overflow-hidden">
          <div className="tbl-wrapper"><table className="tbl">
            <thead><tr><th>Kode Bayar</th><th>Kode PO</th><th>Supplier</th><th className="text-right">Jumlah</th><th>Tgl Bayar</th><th>Metode</th><th>Bank</th><th>No. Ref</th><th>Status</th></tr></thead>
            <tbody>
              {filteredPayments.length === 0 && <tr><td colSpan={9} className="py-12"><div className="flex flex-col items-center gap-2"><CreditCard size={28} style={{ color: 'var(--color-border)' }} /><div className="text-[13px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Tidak ada data pembayaran</div></div></td></tr>}
              {filteredPayments.map((p, idx) => (
                <tr key={p.payment_code || idx}>
                  <td><span className="tbl-mono">{p.payment_code}</span></td>
                  <td><button className="font-medium text-[13px] hover:underline" style={{ color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => openPODetail(p.po_code)}>{p.po_code}</button></td>
                  <td className="font-medium">{p.supplier_name}</td>
                  <td className="text-right font-semibold" style={{ color: '#059669' }}>{formatRupiah(p.amount)}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(p.payment_date)}</td>
                  <td className="capitalize">{p.payment_method?.replace('_', ' ')}</td>
                  <td>{p.bank_name || '-'}</td>
                  <td className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{p.reference_number || '-'}</td>
                  <td><span className={`badge ${p.status === 'paid' ? 'badge-green' : p.status === 'failed' ? 'badge-red' : 'badge-yellow'}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setSelectedPO(null)}>
          <div className="bg-white h-full w-[480px] shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div><div className="font-bold text-[15px]" style={{ color: 'var(--color-text)' }}>Detail PO</div><div className="font-mono text-[12px] mt-0.5" style={{ color: '#7c3aed' }}>{selectedPO.po_code}</div></div>
              <button className="btn btn-outline btn-icon btn-sm" onClick={() => setSelectedPO(null)}><X size={14} /></button>
            </div>
            {detailLoading ? <div className="p-5 flex flex-col items-center gap-3 py-16"><Loader2 size={24} className="animate-spin" style={{ color: '#7c3aed' }} /><div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>Memuat...</div></div>
            : detailData ? (
              <div className="p-5 space-y-4">
                <div className="pb-4 border-b"><div className="text-[11px] font-semibold mb-2 uppercase" style={{ color: 'var(--color-text-muted)' }}>Status</div><span className={`badge badge-${PO_STATUS[detailData.status]?.color || 'gray'}`}>{PO_STATUS[detailData.status]?.label || detailData.status}</span></div>
                <div className="grid grid-cols-2 gap-3">
                  {[['Supplier', detailData.supplier_name],['SO', detailData.so_code || '-'],['Total', formatRupiah(detailData.total_amount)],['Tax', formatRupiah(detailData.tax_amount || 0) + ` (${detailData.tax_configuration || '-'})`],['Dibuat', formatDate(detailData.created_at)],['Items', `${detailData.items?.length || 0} item`]].map(([l, v]) => <div key={l}><div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{l}</div><div className="text-[13px] font-medium" style={{ color: l === 'Total' || l === 'SO' ? '#7c3aed' : 'var(--color-text)' }}>{v}</div></div>)}
                </div>
                {detailData.notes && <div><div className="text-[11px] mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</div><div className="p-3 rounded-lg text-[12.5px]" style={{ background: 'var(--color-bg)' }}>{detailData.notes}</div></div>}
                {detailData.items?.length > 0 && (
                  <div className="pt-4 border-t"><div className="text-[11px] font-semibold mb-3 uppercase" style={{ color: 'var(--color-text-muted)' }}>Item</div>
                    <table className="w-full text-[12px]"><thead><tr><th className="text-left py-2">Produk</th><th className="text-right py-2">Qty</th><th className="text-right py-2">Harga</th><th className="text-right py-2">Subtotal</th></tr></thead>
                      <tbody>{detailData.items.map((item: any, idx: number) => <tr key={idx}><td className="py-2"><div className="font-medium">{item.product_name}</div><div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{item.product_code}</div></td><td className="py-2 text-right">{item.quantity}</td><td className="py-2 text-right">{formatRupiah(getItemPrice(item))}</td><td className="py-2 text-right font-medium">{formatRupiah(getItemSubtotal(item))}</td></tr>)}</tbody></table>
                  </div>
                )}
                {detailData.payments?.length > 0 && (
                  <div className="pt-4 border-t"><div className="text-[11px] font-semibold mb-3 uppercase" style={{ color: 'var(--color-text-muted)' }}>Pembayaran</div>
                    <div className="space-y-2">{detailData.payments.map((pay: any, idx: number) => <div key={idx} className="flex justify-between p-3 rounded-lg" style={{ background: '#ecfdf5' }}><div><div className="text-[12px] font-medium">{pay.payment_code}</div><div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{pay.payment_method} · {pay.reference_number || '-'}</div>{pay.bank_name && <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{pay.bank_name} – {pay.account_number}</div>}</div><div className="text-right"><div className="text-[12px] font-bold" style={{ color: '#059669' }}>{formatRupiah(pay.amount)}</div><div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{formatDate(pay.payment_date)}</div></div></div>)}</div>
                  </div>
                )}
                {detailData.attachments?.length > 0 && (
                  <div className="pt-4 border-t"><div className="text-[11px] font-semibold mb-3 uppercase" style={{ color: 'var(--color-text-muted)' }}>Dokumen</div>
                    <div className="space-y-2">{detailData.attachments.map((att: any, idx: number) => <a key={idx} href={att.file_path} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50" style={{ background: 'var(--color-bg)' }}><FileText size={14} className="text-gray-400" /><span className="text-[12px]">{att.original_filename}</span><span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)' }}>{(att.file_size / 1024).toFixed(1)} KB</span></a>)}</div>
                  </div>
                )}
              </div>
            ) : <div className="p-5 text-center" style={{ color: 'var(--color-text-muted)' }}>Data tidak ditemukan</div>}
          </div>
        </div>
      )}

      {/* Modal Create PO (Wizard) */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={closeCreate}>
          <div className="bg-white rounded-xl w-[820px] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b sticky top-0 bg-white z-10 rounded-t-xl">
              <div>
                <h2 className="font-bold text-[15px]" style={{ color: 'var(--color-text)' }}>Buat Purchase Order</h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {selectedSO ? `SO: ${selectedSO.so_code}` : 'Pilih SO & Supplier'}
                  {selectedSupplierCode ? ` · ${suppliers.find(s => s.supplier_code === selectedSupplierCode)?.supplier_name || selectedSupplierCode}` : ''}
                </p>
              </div>
              <button className="btn btn-outline btn-icon btn-sm" onClick={closeCreate}><X size={14} /></button>
            </div>

            <div className="p-5">
              <StepIndicator current={createStep} />

              {/* STEP 0: Pilih SO & Supplier */}
              {createStep === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="input-label">Sales Order *</label>
                    <select className="input" value={selectedSO?.so_code || ''} onChange={e => handleSelectSO(e.target.value)}>
                      <option value="">Pilih SO</option>
                      {salesOrders.filter(so => so.status !== 'cancelled' && so.status !== 'completed').map(so => (
                        <option key={so.so_code} value={so.so_code}>{so.so_code} – {so.customer_name || so.customer_code}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Supplier *</label>
                    <select className="input" value={selectedSupplierCode} onChange={e => setSelectedSupplierCode(e.target.value)}>
                      <option value="">Pilih Supplier</option>
                      {suppliers.map(s => <option key={s.supplier_code} value={s.supplier_code}>{s.supplier_name}</option>)}
                    </select>
                  </div>
                  {soItemsLoading && <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--color-text-muted)' }}><Loader2 size={14} className="animate-spin" /> Memuat data...</div>}
                  {selectedSO && !soItemsLoading && (
                    <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                      <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                        {[['Customer', selectedSO.customer_name || selectedSO.customer_code],['Status SO', SO_STATUS[selectedSO.status]?.label || selectedSO.status],['Total', formatRupiah(selectedSO.total_amount)],['Jumlah Item', `${selectedSO.items?.length || 0} item`],['PO Sebelumnya', `${selectedSO.po_count || 0} PO`]].map(([l, v]) => <div key={l}><div style={{ color: 'var(--color-text-muted)' }}>{l}</div><div className="font-medium mt-0.5" style={{ color: 'var(--color-text)' }}>{v}</div></div>)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 1: Tambah Item */}
              {createStep === 1 && (
                <div className="space-y-4">
                  {selectedSOItems.length > 0 && (
                    <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                        <div className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>Item dari {selectedSO?.so_code}</div>
                        <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{selectedSOItems.filter(i => getAvailableQty(i.product_code, i.quantity) > 0).length} item tersedia</div>
                      </div>
                      <div className="divide-y">
                        {selectedSOItems.map((item, idx) => {
                          const avail = getAvailableQty(item.product_code, item.quantity);
                          const isAvail = avail > 0;
                          const alreadyAdded = poForms.some(f => f.product_code === item.product_code);
                          return (
                            <div key={idx} className="flex items-center justify-between px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAvail ? 'bg-purple-50' : 'bg-gray-100'}`}>
                                  <Package size={14} style={{ color: isAvail ? '#7c3aed' : '#9ca3af' }} />
                                </div>
                                <div>
                                  <div className="font-medium text-[13px]">{item.product_name}</div>
                                  <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{item.product_code} · Qty SO: {item.quantity}</div>
                                  {item.existingPOs.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{item.existingPOs.map(po => { const piQty = (po.items || []).find(pi => pi.product_code === item.product_code)?.quantity || 0; return <span key={po.po_code} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">{po.po_code}: {piQty}</span>; })}</div>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {alreadyAdded ? (
                                  <div className="flex items-center gap-1 text-[11px] font-medium" style={{ color: '#7c3aed' }}><CheckCircle2 size={14} /> Ditambahkan</div>
                                ) : isAvail ? (
                                  <><div className="text-right"><div className="text-[13px] font-bold" style={{ color: '#7c3aed' }}>{avail}</div><div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>tersedia</div></div><button className="btn btn-primary btn-sm" onClick={() => addPOForm(item)}><Plus size={12} /> Tambah</button></>
                                ) : <div className="flex items-center gap-1 text-[11px] font-medium" style={{ color: '#059669' }}><CheckCircle2 size={14} /> Selesai</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* PO Forms */}
                  {poForms.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>Item PO ({poForms.length})</div>
                      {poForms.map((form, idx) => {
                        const otherQty = poForms.filter(f => f.id !== form.id && f.product_code === form.product_code).reduce((s, f) => s + f.quantity, 0);
                        const existingQty = existingPOs.filter(po => po.status !== 'rejected' && po.status !== 'cancelled').flatMap(po => po.items || []).filter(i => i.product_code === form.product_code).reduce((s, i) => s + (i.quantity || 0), 0);
                        const sisa = Math.max(0, form.so_quantity - existingQty - otherQty);
                        const maxQty = getAvailableQty(form.product_code, form.so_quantity, form.id);
                        const isFormValid = form.quantity > 0 && form.unit_price > 0;
                        return (
                          <div key={form.id} className="border rounded-xl p-4 relative" style={{ borderColor: isFormValid ? 'var(--color-border)' : '#fca5a5', background: isFormValid ? 'white' : '#fff5f5' }}>
                            <div className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">{idx + 1}</div>
                            <button className="absolute top-3 right-3 p-1 rounded hover:bg-red-50 transition-colors" style={{ color: '#f87171' }} onClick={() => setConfirmDelete(form.product_code)}><Trash2 size={14} /></button>
                            <div className="mb-3 pb-3 border-b" style={{ borderColor: 'var(--color-border-soft)' }}>
                              <div className="font-medium text-[13px]">{form.product_name}</div>
                              <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{form.product_code} · Qty SO: {form.so_quantity} · Sisa: {sisa}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="input-label">Quantity PO <span className="text-[10px] ml-1" style={{ color: 'var(--color-text-muted)' }}>(Max: {maxQty})</span></label>
                                <input type="number" className="input" min="1" max={maxQty} value={form.quantity || ''}
                                  onChange={e => {
                                    const v = Number(e.target.value);
                                    if (v > maxQty) { toast.error(`Maksimal ${maxQty}`); return; }
                                    updatePOForm(form.product_code, 'quantity', v);
                                  }}
                                />
                              </div>
                              <div>
                                <label className="input-label">Harga Beli per Unit *</label>
                                <input type="number" className="input" min="0" value={form.unit_price || ''}
                                  onChange={e => updatePOForm(form.product_code, 'unit_price', Number(e.target.value))}
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="input-label">Catatan</label>
                                <input className="input" placeholder="Catatan item..." value={form.notes || ''}
                                  onChange={e => updatePOForm(form.product_code, 'notes', e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              {!isFormValid && <div className="flex items-center gap-1 text-[11px]" style={{ color: '#dc2626' }}><AlertCircle size={12} /> Lengkapi qty dan harga</div>}
                              <div className="ml-auto text-right text-[12px]">Subtotal: <span className="text-[15px] font-bold" style={{ color: '#7c3aed' }}>{formatRupiah(form.subtotal)}</span></div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-between items-center px-4 py-3 rounded-xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}><span className="text-[12px] font-medium">Total ({poForms.length} item)</span><span className="text-[16px] font-bold" style={{ color: '#7c3aed' }}>{formatRupiah(totalAllForms)}</span></div>
                    </div>
                  )}
                  {poForms.length === 0 && <div className="flex flex-col items-center gap-2 py-8" style={{ color: 'var(--color-text-muted)' }}><Package size={24} /><div className="text-[13px]">Belum ada item. Klik "Tambah" di atas.</div></div>}
                </div>
              )}

              {/* STEP 2: Pajak & Dokumen */}
              {createStep === 2 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                    <div className="text-[11px] font-semibold uppercase mb-3" style={{ color: 'var(--color-text-muted)' }}>Ringkasan</div>
                    <div className="space-y-1.5 text-[12px]">
                      <div className="flex justify-between"><span>Supplier</span><span className="font-medium">{suppliers.find(s => s.supplier_code === selectedSupplierCode)?.supplier_name || selectedSupplierCode}</span></div>
                      <div className="flex justify-between"><span>Jumlah Item</span><span className="font-medium">{poForms.length} item</span></div>
                      <div className="flex justify-between"><span>Total Sebelum Pajak</span><span className="font-medium">{formatRupiah(totalAllForms)}</span></div>
                    </div>
                  </div>

                  <div className="border rounded-xl p-4" style={{ borderColor: 'var(--color-border)' }}>
                    <label className="input-label font-semibold mb-3 block">Pajak</label>
                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div><label className="input-label">Tipe Pajak</label><select className="input" value={poTaxType} onChange={e => { setPoTaxType(e.target.value); setPoTaxValue(0); }}><option value="percentage">Persen (%)</option><option value="amount">Nominal (Rp)</option></select></div>
                      <div className="col-span-2">
                        <label className="input-label">{poTaxType === 'percentage' ? 'Persentase Pajak (%)' : 'Nominal Pajak (Rp)'}</label>
                        <div className="relative">
                          {poTaxType === 'amount' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-medium">Rp</span>}
                          <input type="number" className="input" style={{ paddingLeft: poTaxType === 'amount' ? '32px' : '12px', paddingRight: poTaxType === 'percentage' ? '32px' : '12px' }} placeholder={poTaxType === 'percentage' ? '11' : '50000'} min="0" value={poTaxValue || ''} onChange={e => setPoTaxValue(Number(e.target.value))} />
                          {poTaxType === 'percentage' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-bold">%</span>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 rounded-lg space-y-1.5 text-[12px] border" style={{ background: 'var(--color-bg)' }}>
                      <div className="flex justify-between" style={{ color: 'var(--color-text-muted)' }}><span>Subtotal:</span><span className="font-medium">{formatRupiah(totalAllForms)}</span></div>
                      <div className="flex justify-between" style={{ color: 'var(--color-text-muted)' }}><span>Pajak {poTaxType === 'percentage' ? `(${poTaxValue}%)` : '(Nominal)'}:</span><span className="font-medium" style={{ color: '#dc2626' }}>+ {formatRupiah(calculatedTaxAmount)}</span></div>
                      <div className="flex justify-between border-t pt-1.5 font-bold text-[13px]" style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)' }}><span>Grand Total:</span><span style={{ color: '#7c3aed' }}>{formatRupiah(grandTotal)}</span></div>
                    </div>
                  </div>

                  <div className="border rounded-xl p-4" style={{ borderColor: 'var(--color-border)' }}>
                    <label className="input-label block mb-2">Upload Dokumen PO</label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => poFileRef.current?.click()}>
                      <input ref={poFileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={e => setPoDocument(e.target.files?.[0] || null)} />
                      {poDocument ? (
                        <div className="flex items-center justify-center gap-2"><FileText size={16} /><span className="text-[12px]">{poDocument.name}</span><span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{(poDocument.size / 1024).toFixed(1)} KB</span><button className="ml-2 text-red-500 hover:text-red-700" onClick={e => { e.stopPropagation(); setPoDocument(null); }}><X size={14} /></button></div>
                      ) : <div><Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} /><div className="text-[12px]">Klik untuk upload dokumen</div><div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>PDF, Word, Excel, Gambar</div></div>}
                    </div>
                    {poDocument && <div className="mt-2"><label className="input-label">Catatan Dokumen</label><input className="input" placeholder="Keterangan..." value={poDocNotes} onChange={e => setPoDocNotes(e.target.value)} /></div>}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 mt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button className="btn btn-outline btn-sm" onClick={createStep === 0 ? closeCreate : () => setCreateStep(s => s - 1)}>{createStep === 0 ? 'Batal' : '← Kembali'}</button>
                <div className="flex gap-2">
                  {createStep < 2 ? (
                    <button className="btn btn-primary btn-sm" onClick={goNextStep}>Lanjut →</button>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={handleCreatePO} disabled={creating || poForms.length === 0}>
                      {creating ? <><Loader2 size={13} className="animate-spin" /> Menyimpan...</> : 'Simpan PO'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Payment */}
      {showPayment && paymentPO && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowPayment(false)}>
          <div className="bg-white rounded-xl w-[600px] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10 rounded-t-xl"><h2 className="font-bold text-[15px]" style={{ color: 'var(--color-text)' }}>Pembayaran PO</h2><button className="btn btn-outline btn-icon btn-sm" onClick={() => setShowPayment(false)}><X size={14} /></button></div>
            <div className="p-5 space-y-4">
              <div className="p-3 rounded-lg space-y-1" style={{ background: 'var(--color-bg)' }}><div className="text-[12px] font-medium">PO: <span style={{ color: '#7c3aed' }}>{paymentPO.po_code}</span></div><div className="text-[12px]">Supplier: {paymentPO.supplier_name}</div><div className="text-[13px] font-bold" style={{ color: '#059669' }}>Total: {formatRupiah(paymentPO.total_amount)}</div></div>
              <div>
                <label className="input-label flex items-center gap-1.5 block mb-2">Dokumen Pembayaran <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: '#fef2f2', color: '#dc2626' }}>Wajib</span></label>
                <div className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${isDragOver ? 'border-purple-400 bg-purple-50' : 'hover:bg-gray-50'}`}
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)}
                  onDrop={e => { e.preventDefault(); setIsDragOver(false); setPaymentFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }} onClick={() => payFileRef.current?.click()}>
                  <input ref={payFileRef} type="file" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={e => setPaymentFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
                  <Upload size={22} className="mx-auto mb-1.5" style={{ color: 'var(--color-text-muted)' }} /><div className="text-[12px]">Klik atau drag & drop</div><div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>PDF, JPG, PNG</div>
                </div>
                {paymentFiles.length > 0 && <div className="mt-2 space-y-1">{paymentFiles.map((f, i) => <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}><div className="flex items-center gap-2"><FileText size={13} /><span className="text-[12px]">{f.name}</span></div><button className="text-red-400 hover:text-red-600" onClick={() => setPaymentFiles(prev => prev.filter((_, j) => j !== i))}><X size={13} /></button></div>)}</div>}
              </div>
              <div><label className="input-label">Metode Pembayaran *</label><select className="input" value={paymentForm.payment_method} onChange={e => setPaymentForm(p => ({ ...p, payment_method: e.target.value }))}><option value="transfer">Transfer Bank</option><option value="cash">Cash</option><option value="other">Lainnya</option></select></div>
              {paymentForm.payment_method === 'transfer' && (
                <div className="space-y-3 p-3 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="text-[11px] font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Detail Transfer</div>
                  <div>
                    <label className="input-label">Rekening Perusahaan *</label>
                    <select className="input" value={paymentForm.company_bank_code} onChange={e => setPaymentForm(p => ({ ...p, company_bank_code: e.target.value }))}>
                      <option value="">Pilih rekening perusahaan</option>
                      {companyBanks.map(b => (
                        <option key={b.account_code} value={b.account_code}>
                          {b.bank_name} – {b.account_number} ({b.account_holder})
                          {b.company_name ? ` [${b.company_name}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="input-label">Bank Supplier *</label><select className="input" value={paymentForm.bank_name} onChange={e => setPaymentForm(p => ({ ...p, bank_name: e.target.value }))}><option value="">Pilih bank</option>{['BCA','Mandiri','BNI','BRI'].map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                    <div><label className="input-label">No. Rekening Supplier *</label><input className="input" placeholder="Nomor rekening" value={paymentForm.account_number} onChange={e => setPaymentForm(p => ({ ...p, account_number: e.target.value }))} /></div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Tanggal Bayar</label><input type="date" className="input" value={paymentForm.payment_date} onChange={e => setPaymentForm(p => ({ ...p, payment_date: e.target.value }))} /></div>
                <div><label className="input-label">No. Referensi *</label><input className="input" placeholder="Nomor referensi" value={paymentForm.reference_number} onChange={e => setPaymentForm(p => ({ ...p, reference_number: e.target.value }))} /></div>
              </div>
              <div><label className="input-label">Catatan</label><textarea className="input" rows={2} placeholder="Catatan..." value={paymentForm.notes} onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}><button className="btn btn-outline btn-sm" onClick={() => setShowPayment(false)}>Batal</button><button className="btn btn-primary btn-sm" onClick={handlePayment} disabled={paying}>{paying ? <><Loader2 size={13} className="animate-spin" /> Menyimpan...</> : 'Simpan Pembayaran'}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}