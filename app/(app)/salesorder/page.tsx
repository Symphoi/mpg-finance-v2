'use client';
import { useState, useEffect } from 'react';
import { usePaginated, useDebounce } from '@/hooks/useApi';
import { formatRupiah, formatDate, SO_STATUS } from '@/lib/utils';
import { Plus, Search, Filter, Download, Eye, X, ChevronLeft, ChevronRight, Upload, Trash2, FileText, AlertCircle, Paperclip } from 'lucide-react';
import StatusProgress, { SO_STEPS } from '@/components/Statusprogress';

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'processing', label: 'Processing' },
  { value: 'invoicing', label: 'Invoicing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface SO {
  id: number;
  so_code: string;
  customer_name: string;
  customer_phone: string;
  sales_rep: string;
  total_amount: number;
  tax_amount: number;
  status: string;
  accounting_status: string;
  invoice_number: string;
  project_code: string;
  customer_type: string;
  notes: string;
  created_at: string;
  item_count: number;
  po_count: number;
  items?: Array<{ product_id: number; product_code: string; product_name: string; quantity: string; unit_price: string; }>;
  attachments?: Array<{ id: number; attachment_code: string; filename: string; original_filename: string; file_type: string; file_size: number; file_path: string; uploaded_at: string; }>;
  attachment_count?: number;
}

export default function SalesOrderPage() {
  const { data, meta, loading, refetch, setSearch, setStatus, setPage, setParam } =
    usePaginated<SO>('/api/sales-orders');

  const [search, setSearchLocal] = useState('');
  const [status, setStatusLocal] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => { setSearch(debouncedSearch); }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedSO, setSelectedSO] = useState<SO | null>(null);
  const [detailData, setDetailData] = useState<SO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);

  // Master Data Arrays
  const [products, setProducts] = useState<Array<{ id: number; product_code: string; product_name: string; unit_price: number }>>([]);
  const [customers, setCustomers] = useState<Array<{ id: number; customer_code: string; customer_name: string; customer_phone: string; customer_email: string; customer_type: string; billing_address: string; shipping_address: string }>>([]);
  const [salesReps, setSalesReps] = useState<Array<{ id: number; user_code: string; name: string; email: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: number; project_code: string; name: string; client_name: string }>>([]);

  const [createForm, setCreateForm] = useState({
    customer_code: '',
    sales_rep_code: '',
    project_code: '',
    tax_type: 'percentage',
    tax_value: 11,
    shipping_cost: 0,
    notes: '',
    items: [] as { product_code: string; product_name: string; quantity: number; unit_price: number; subtotal: number }[],
    so_document: null as File | null,
    other_documents: [] as File[]
  });

  const [selectedProductCode, setSelectedProductCode] = useState('');
  const [itemError, setItemError] = useState('');

  // Fetch Master Data
  useEffect(() => {
    fetch('/api/products?limit=100')
      .then(r => r.json())
      .then(d => setProducts(d.data || []))
      .catch(() => []);

    fetch('/api/customers?limit=100')
      .then(r => r.json())
      .then(d => setCustomers(d.data || []))
      .catch(() => []);

    fetch('/api/rbac?type=users&limit=100')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          const sales = d.data.filter((u: any) =>
            u.roles?.toLowerCase().includes('sales')
          );
          setSalesReps(sales);
        }
      })
      .catch(() => []);

    fetch('/api/projects?limit=100')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) setProjects(d.data);
      })
      .catch(() => []);
  }, []);

  // Fetch Detail SO (lazy-loading)
  useEffect(() => {
    if (selectedSO?.so_code) {
      setDetailLoading(true);
      fetch(`/api/sales-orders?so_code=${encodeURIComponent(selectedSO.so_code)}`)
        .then(r => r.json())
        .then(d => setDetailData(d.success ? d.data : null))
        .catch(() => setDetailData(null))
        .finally(() => setDetailLoading(false));
    } else {
      setDetailData(null);
    }
  }, [selectedSO?.so_code]);

  const applySearch = () => {
    setSearch(search);
    setParam('from', from);
    setParam('to', to);
  };

  const addItem = () => {
    if (!selectedProductCode) {
      setItemError('Pilih produk terlebih dahulu');
      setTimeout(() => setItemError(''), 3000);
      return;
    }

    const product = products.find(p => p.product_code === selectedProductCode);
    if (!product) return;

    const existingItem = createForm.items.find(item => item.product_code === product.product_code);
    if (existingItem) {
      setItemError(`Produk "${product.product_name}" sudah ada!`);
      setTimeout(() => setItemError(''), 3000);
      return;
    }

    const quantity = 1;
    const unitPrice = product.unit_price;
    const subtotal = quantity * unitPrice;

    setCreateForm({
      ...createForm,
      items: [...createForm.items, {
        product_code: product.product_code,
        product_name: product.product_name,
        quantity: quantity,
        unit_price: unitPrice,
        subtotal: subtotal
      }]
    });
    setSelectedProductCode('');
    setItemError('');
  };

  const removeItem = (index: number) => {
    setCreateForm({
      ...createForm,
      items: createForm.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: string, value: string) => {
    const updatedItems = [...createForm.items];
    const numValue = field === 'product_code' || field === 'product_name' ? value : Number(value);
    updatedItems[index] = { 
      ...updatedItems[index], 
      [field]: numValue,
    };
    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].subtotal = updatedItems[index].quantity * updatedItems[index].unit_price;
    }
    setCreateForm({ ...createForm, items: updatedItems });
  };

  // Kalkulasi
  const totalAmountBase = createForm.items.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unit_price || 0);
  }, 0);

  const calculatedTaxAmount = createForm.tax_type === 'percentage'
    ? (totalAmountBase * ((Number(createForm.tax_value) || 0) / 100))
    : (Number(createForm.tax_value) || 0);

  const grandTotalAmount = totalAmountBase + calculatedTaxAmount + (createForm.shipping_cost || 0);

  // Other documents
  const addOtherDocument = () => {
    const input = document.getElementById('other_docs_input') as HTMLInputElement;
    if (input?.files) {
      const newFiles = Array.from(input.files);
      setCreateForm({
        ...createForm,
        other_documents: [...createForm.other_documents, ...newFiles]
      });
      input.value = '';
    }
  };

  const removeOtherDocument = (index: number) => {
    setCreateForm({
      ...createForm,
      other_documents: createForm.other_documents.filter((_, i) => i !== index)
    });
  };

  const handleCreateSO = async () => {
    if (!createForm.customer_code) {
      alert('Customer wajib diisi');
      return;
    }
    if (createForm.items.length === 0) {
      alert('Minimal 1 item produk');
      return;
    }
    if (!createForm.so_document) {
      alert('Dokumen SO wajib diupload');
      return;
    }

    // ✅ Ambil data customer dari array customers
    const customer = customers.find(c => c.customer_code === createForm.customer_code);
    if (!customer) {
      alert('Customer tidak ditemukan');
      return;
    }

    // ✅ Ambil data sales rep dari array salesReps
    const salesRep = createForm.sales_rep_code 
      ? salesReps.find(s => s.user_code === createForm.sales_rep_code) 
      : null;

    // Siapkan data backend
    const soData = {
      customer_name: customer.customer_name,
      customer_phone: customer.customer_phone || '',
      customer_email: customer.customer_email || null,
      customer_code: customer.customer_code,
      customer_type: customer.customer_type || 'company',
      billing_address: customer.billing_address || null,
      shipping_address: customer.shipping_address || null,
      sales_rep: salesRep?.name || null,
      sales_rep_email: salesRep?.email || null,
      sales_rep_code: salesRep?.user_code || null,
      project_code: createForm.project_code || null,
      total_amount: grandTotalAmount,
      tax_amount: calculatedTaxAmount,
      shipping_cost: createForm.shipping_cost || 0,
      notes: createForm.notes || null,
      tax_configuration: createForm.tax_type === 'percentage' ? 'percentage' : 'amount',
      items: createForm.items.map(item => ({
        product_name: item.product_name,
        product_code: item.product_code,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal
      })),
      taxes: []
    };

    const formData = new FormData();
    formData.append('data', JSON.stringify(soData));

    if (createForm.so_document) {
      formData.append('sales_order_doc', createForm.so_document);
    }

    createForm.other_documents.forEach((doc) => {
      formData.append('other_docs', doc);
    });

    try {
      const res = await fetch('/api/sales-orders', {
        method: 'POST',
        body: formData
      });
      const resData = await res.json();
      
      if (resData.success) {
        setShowCreate(false);
        setCreateForm({
          customer_code: '',
          sales_rep_code: '',
          project_code: '',
          tax_type: 'percentage',
          tax_value: 11,
          shipping_cost: 0,
          notes: '',
          items: [],
          so_document: null,
          other_documents: []
        });
        setSelectedProductCode('');
        refetch();
        alert(`SO ${resData.so_code} berhasil dibuat!`);
      } else {
        alert('Gagal membuat SO: ' + resData.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Sales Order</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{meta.total || 0} total SO</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm"><Download size={12} /> Export</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Buat SO</button>
        </div>
      </div>

      {/* Filter Control Dashboard */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="input-label">Cari</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input className="input" style={{ paddingLeft: 32 }} placeholder="Kode SO, customer, invoice..." value={search} onChange={(e) => setSearchLocal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applySearch()} />
            </div>
          </div>
          <div>
            <label className="input-label">Status</label>
            <select className="input" value={status} onChange={(e) => { setStatusLocal(e.target.value); setStatus(e.target.value); }}>
              {STATUS_OPTIONS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Dari</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Sampai</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={applySearch}><Filter size={12} /> Terapkan</button>
          <button className="btn btn-outline btn-sm" onClick={() => {
            setSearchLocal(''); setStatusLocal(''); setFrom(''); setTo('');
            setSearch(''); setStatus(''); setParam('from', ''); setParam('to', '');
          }}>Reset</button>
        </div>
      </div>

      {/* Data Table */}
      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kode SO</th>
                <th>Customer</th>
                <th>Sales Rep</th>
                <th>Invoice</th>
                <th>Project</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th>Tgl Dibuat</th>
                <th>Items / PO</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>
              )}
              {!loading && data.length === 0 && (
                <tr><td colSpan={10} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Tidak ada data</td></tr>
              )}
              {data.map((so) => {
                const st = SO_STATUS[so.status] ?? { label: so.status, color: 'gray' };
                return (
                  <tr key={so.id || so.so_code}>
                    <td><span className="tbl-mono">{so.so_code}</span></td>
                    <td>
                      <div className="font-medium" style={{ color: 'var(--color-text)' }}>{so.customer_name}</div>
                      {so.customer_phone && <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{so.customer_phone}</div>}
                    </td>
                    <td>{so.sales_rep || '-'}</td>
                    <td>{so.invoice_number || '-'}</td>
                    <td>{so.project_code || '-'}</td>
                    <td className="text-right font-semibold" style={{ color: 'var(--color-text)' }}>
                      {formatRupiah(so.total_amount)}
                    </td>
                    <td><span className={`badge badge-${st.color}`}>{st.label}</span></td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(so.created_at)}</td>
                    <td><span className="text-[11.5px]">{so.item_count || so.items?.length || 0} item · {so.po_count || 0} PO</span></td>
                    <td>
                      <button className="btn btn-outline btn-icon btn-sm" onClick={() => setSelectedSO(so)}>
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
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
      {selectedSO && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setSelectedSO(null)}>
          <div className="bg-white h-full w-[480px] shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div><div className="font-bold text-[15px]" style={{ color: 'var(--color-text)' }}>Detail SO</div><div className="font-mono text-[12px] mt-0.5" style={{ color: '#7c3aed' }}>{selectedSO.so_code}</div></div>
              <button className="btn btn-outline btn-icon btn-sm" onClick={() => setSelectedSO(null)}><X size={14} /></button>
            </div>
            {detailLoading ? <div className="p-5 text-center" style={{ color: 'var(--color-text-muted)' }}>Memuat...</div> : detailData && (
              <div className="p-5 space-y-4">
                <div className="pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="text-[11px] font-semibold mb-3" style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Status Progres</div>
                  <StatusProgress steps={SO_STEPS} current={detailData.status} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Customer</div><div className="text-[13px] font-medium">{detailData.customer_name}</div></div>
                  <div><div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Telepon</div><div className="text-[13px]">{detailData.customer_phone || '-'}</div></div>
                  <div><div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Sales Rep</div><div className="text-[13px]">{detailData.sales_rep || '-'}</div></div>
                  <div><div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Project</div><div className="text-[13px]">{detailData.project_code || '-'}</div></div>
                  <div><div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Invoice</div><div className="text-[13px]">{detailData.invoice_number || '-'}</div></div>
                  <div><div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Customer Type</div><div className="text-[13px]">{detailData.customer_type}</div></div>
                  <div><div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Total</div><div className="text-[13px] font-bold" style={{ color: '#7c3aed' }}>{formatRupiah(detailData.total_amount)}</div></div>
                  <div><div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Pajak</div><div className="text-[13px]">{formatRupiah(detailData.tax_amount)}</div></div>
                  <div><div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Dibuat</div><div className="text-[13px]">{formatDate(detailData.created_at)}</div></div>
                  <div><div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Items / PO</div><div className="text-[13px]">{detailData.item_count} item · {detailData.po_count} PO</div></div>
                </div>
                {detailData.notes && <div><div className="text-[11px] mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</div><div className="p-3 rounded-lg text-[12.5px]" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>{detailData.notes}</div></div>}

                {detailData.items && detailData.items.length > 0 && (
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="text-[11px] font-semibold mb-3" style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Item Produk</div>
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <th className="text-left py-2">Produk</th>
                          <th className="text-right py-2">Qty</th>
                          <th className="text-right py-2">Harga</th>
                          <th className="text-right py-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.items.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                            <td className="py-2">
                              <div className="font-medium" style={{ color: 'var(--color-text)' }}>{item.product_name}</div>
                              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{item.product_code}</div>
                            </td>
                            <td className="py-2 text-right">{item.quantity}</td>
                            <td className="py-2 text-right">{formatRupiah(Number(item.unit_price))}</td>
                            <td className="py-2 text-right font-medium">{formatRupiah(Number(item.quantity) * Number(item.unit_price))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Creation Form */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl w-[800px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h2 className="font-bold text-[15px]" style={{ color: 'var(--color-text)' }}>Buat Sales Order</h2>
              <button className="btn btn-outline btn-icon btn-sm" onClick={() => setShowCreate(false)}><X size={14} /></button>
            </div>
            <div className="p-5 space-y-4">

              {/* ✅ Customer Dropdown (hanya dropdown, data diambil pas submit) */}
              <div>
                <label className="input-label">Customer *</label>
                <select 
                  className="input" 
                  value={createForm.customer_code} 
                  onChange={(e) => setCreateForm({...createForm, customer_code: e.target.value})}
                >
                  <option value="">Pilih Customer</option>
                  {customers.map(c => (
                    <option key={c.customer_code} value={c.customer_code}>{c.customer_name}</option>
                  ))}
                </select>
              </div>

              {/* ✅ Sales Rep Dropdown (hanya dropdown, data diambil pas submit) */}
              <div>
                <label className="input-label">Sales Rep</label>
                <select 
                  className="input" 
                  value={createForm.sales_rep_code} 
                  onChange={(e) => setCreateForm({...createForm, sales_rep_code: e.target.value})}
                >
                  <option value="">Pilih Sales Rep</option>
                  {salesReps.map(s => (
                    <option key={s.user_code} value={s.user_code}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Project */}
              <div>
                <label className="input-label">Proyek</label>
                <select 
                  className="input" 
                  value={createForm.project_code} 
                  onChange={(e) => setCreateForm({...createForm, project_code: e.target.value})}
                >
                  <option value="">Pilih Proyek</option>
                  {projects.map(p => <option key={p.project_code} value={p.project_code}>{p.name} - {p.client_name}</option>)}
                </select>
              </div>

              {/* Pajak */}
              <div className="grid grid-cols-3 gap-3 items-end border-t pt-4">
                <div>
                  <label className="input-label">Tipe Pajak</label>
                  <select
                    className="input"
                    value={createForm.tax_type}
                    onChange={(e) => setCreateForm({...createForm, tax_type: e.target.value, tax_value: 0})}
                  >
                    <option value="percentage">Persen (%)</option>
                    <option value="amount">Nominal (Rp)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="input-label">
                    {createForm.tax_type === 'percentage' ? 'Persentase Pajak (%)' : 'Nominal Pajak (Rp)'}
                  </label>
                  <div className="relative">
                    {createForm.tax_type === 'amount' && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-medium">Rp</span>
                    )}
                    <input
                      type="number"
                      className="input"
                      style={{
                        paddingLeft: createForm.tax_type === 'amount' ? '32px' : '12px',
                        paddingRight: createForm.tax_type === 'percentage' ? '32px' : '12px'
                      }}
                      placeholder={createForm.tax_type === 'percentage' ? '11' : '50000'}
                      min="0"
                      value={createForm.tax_value || ''}
                      onChange={(e) => setCreateForm({...createForm, tax_value: Number(e.target.value)})}
                    />
                    {createForm.tax_type === 'percentage' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-bold">%</span>
                    )}
                  </div>
                </div>
              </div>

             

              {/* Item Produk */}
              <div className="border rounded-lg p-4" style={{ borderColor: 'var(--color-border)' }}>
                <label className="input-label font-semibold mb-2 block">Item Produk *</label>
                <div className="flex gap-2 mb-3">
                  <select 
                    className="input flex-1" 
                    value={selectedProductCode} 
                    onChange={(e) => setSelectedProductCode(e.target.value)}
                  >
                    <option value="">Pilih Produk</option>
                    {products
                      .filter(p => p.product_code)
                      .map(p => (
                        <option key={p.product_code} value={p.product_code}>
                          {p.product_name} - {formatRupiah(p.unit_price)}
                        </option>
                      ))
                    }
                  </select>
                  <button type="button" className="btn btn-primary btn-sm" onClick={addItem}>
                    <Plus size={14} /> Tambah
                  </button>
                </div>
                {itemError && (
                  <div className="text-[11px] text-red-500 mb-2 flex items-center gap-1">
                    <AlertCircle size={12} /> {itemError}
                  </div>
                )}

                {createForm.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <th className="text-left py-2">Produk</th>
                          <th style={{ width: 80 }} className="text-right">Qty</th>
                          <th style={{ width: 130 }} className="text-right">Harga</th>
                          <th className="text-right" style={{ width: 130 }}>Subtotal</th>
                          <th style={{ width: 30 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {createForm.items.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                            <td className="py-2">
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{item.product_code}</div>
                            </td>
                            <td className="py-2">
                              <input type="number" className="input text-right p-1" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                            </td>
                            <td className="py-2">
                              <input type="number" className="input text-right p-1" min="0" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} />
                            </td>
                            <td className="py-2 text-right font-medium">{formatRupiah(item.subtotal || item.quantity * item.unit_price)}</td>
                            <td className="py-2 text-center">
                              <button onClick={() => removeItem(idx)} className="text-red-500"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Live Financial Summary */}
                    <div className="mt-4 p-3 rounded-lg bg-gray-50 space-y-1.5 text-[12px] border">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal (Sebelum Pajak):</span>
                        <span className="font-medium">{formatRupiah(totalAmountBase)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 items-center">
                        <span>Pajak {createForm.tax_type === 'percentage' ? `(${createForm.tax_value}%)` : '(Nominal)'}:</span>
                        <span className="font-medium text-red-600">+ {formatRupiah(calculatedTaxAmount)}</span>
                      </div>
                      {createForm.shipping_cost > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Biaya Pengiriman:</span>
                          <span className="font-medium">+ {formatRupiah(createForm.shipping_cost)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-1.5 font-bold text-[13px]" style={{ color: 'var(--color-text)' }}>
                        <span>Total Akhir (Grand Total):</span>
                        <span style={{ color: '#7c3aed' }}>{formatRupiah(grandTotalAmount)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                    Belum ada item. Silakan pilih produk dari dropdown di atas.
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="input-label">Catatan</label>
                <textarea 
                  className="input" rows={2} placeholder="Catatan tambahan..." 
                  value={createForm.notes} onChange={(e) => setCreateForm({...createForm, notes: e.target.value})} 
                />
              </div>
              {/* Upload Dokumen Utama (Wajib) */}
              <div className="border rounded-lg p-4" style={{ borderColor: 'var(--color-border)' }}>
                <label className="input-label block mb-2">
                  Upload Dokumen SO/SP Client <span className="text-red-500">*</span>
                </label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50"
                  onClick={() => document.getElementById('so_document_input')?.click()}
                >
                  <input
                    id="so_document_input"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={(e) => setCreateForm({...createForm, so_document: e.target.files?.[0] || null})}
                  />
                  {createForm.so_document ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText size={16} />
                      <span className="text-[12px]">{createForm.so_document.name}</span>
                      <span className="text-[10px] text-gray-400">({(createForm.so_document.size / 1024).toFixed(1)} KB)</span>
                      <button
                        className="ml-2 text-red-500 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreateForm({...createForm, so_document: null});
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
                      <div className="text-[12px]">Klik untuk upload dokumen utama</div>
                      <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>PDF, Word, Excel (Max 10MB)</div>
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ Upload Dokumen Lainnya (Opsional) */}
              <div className="border rounded-lg p-4" style={{ borderColor: 'var(--color-border)' }}>
                <label className="input-label block mb-2">Dokumen Pendukung Lainnya</label>
                
                {createForm.other_documents.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {createForm.other_documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Paperclip size={14} className="text-gray-400" />
                          <span className="text-[12px]">{doc.name}</span>
                          <span className="text-[10px] text-gray-400">({(doc.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button 
                          onClick={() => removeOtherDocument(idx)} 
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50"
                  onClick={() => document.getElementById('other_docs_input')?.click()}
                >
                  <input
                    id="other_docs_input"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={addOtherDocument}
                  />
                  <div>
                    <Upload size={20} className="mx-auto mb-1" style={{ color: 'var(--color-text-muted)' }} />
                    <div className="text-[12px]">Klik untuk menambah dokumen pendukung</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      PDF, Word, Excel, Gambar (Max 10MB/file)
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowCreate(false)}>Batal</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateSO}>
                  Simpan Sales Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}