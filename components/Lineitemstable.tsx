'use client';
import { Plus, Trash2 } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

// ─── SO Items ────────────────────────────────────────────────
export interface SOItem {
  product_code: string;
  product_name: string;
  quantity: string;
  unit_price: string;
}

interface SOItemsProps {
  items: SOItem[];
  onChange: (items: SOItem[]) => void;
  products?: { product_code: string; product_name: string; unit_price: number }[];
  readonly?: boolean;
}

export function SOLineItems({ items, onChange, products = [], readonly }: SOItemsProps) {
  const setItem = (i: number, k: keyof SOItem, v: string) =>
    onChange(items.map((x, j) => j === i ? { ...x, [k]: v } : x));

  const addItem = () =>
    onChange([...items, { product_code: '', product_name: '', quantity: '1', unit_price: '' }]);

  const removeItem = (i: number) =>
    onChange(items.filter((_, j) => j !== i));

  const onProductSelect = (i: number, productCode: string) => {
    const p = products.find((x) => x.product_code === productCode);
    if (p) setItem(i, 'product_code', p.product_code);
    if (p) onChange(items.map((x, j) => j === i ? { ...x, product_code: p.product_code, product_name: p.product_name, unit_price: String(p.unit_price ?? '') } : x));
  };

  const total = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-bold" style={{ color: 'var(--color-text)' }}>Item Produk</div>
        {!readonly && (
          <button className="btn btn-outline btn-sm" onClick={addItem}>
            <Plus size={11} /> Tambah Item
          </button>
        )}
      </div>
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafaff' }}>
              <th style={TH}>Produk</th>
              <th style={{ ...TH, width: 90, textAlign: 'right' }}>Qty</th>
              <th style={{ ...TH, width: 140, textAlign: 'right' }}>Harga Satuan</th>
              <th style={{ ...TH, width: 140, textAlign: 'right' }}>Subtotal</th>
              {!readonly && <th style={{ ...TH, width: 36 }} />}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--color-border-soft)' }}>
                <td style={TD}>
                  {readonly ? (
                    <div>
                      <div className="text-[12.5px] font-medium" style={{ color: 'var(--color-text)' }}>{item.product_name}</div>
                      {item.product_code && <div className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{item.product_code}</div>}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {products.length > 0 && (
                        <select className="input" style={{ fontSize: 12 }} value={item.product_code}
                          onChange={(e) => onProductSelect(i, e.target.value)}>
                          <option value="">Pilih produk</option>
                          {products.map((p) => <option key={p.product_code} value={p.product_code}>{p.product_name}</option>)}
                        </select>
                      )}
                      <input className="input" style={{ fontSize: 12 }} placeholder="Nama produk *"
                        value={item.product_name} onChange={(e) => setItem(i, 'product_name', e.target.value)} />
                    </div>
                  )}
                </td>
                <td style={{ ...TD, textAlign: 'right' }}>
                  {readonly ? item.quantity :
                    <input type="number" className="input" style={{ fontSize: 12, textAlign: 'right' }} min="1"
                      value={item.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} />}
                </td>
                <td style={{ ...TD, textAlign: 'right' }}>
                  {readonly ? formatRupiah(Number(item.unit_price)) :
                    <input type="number" className="input" style={{ fontSize: 12, textAlign: 'right' }} min="0"
                      placeholder="0" value={item.unit_price} onChange={(e) => setItem(i, 'unit_price', e.target.value)} />}
                </td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: 'var(--color-text)' }}>
                  {formatRupiah((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                </td>
                {!readonly && (
                  <td style={{ ...TD, textAlign: 'center' }}>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)}>
                        <Trash2 size={13} style={{ color: '#dc2626' }} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--color-border)', background: '#fafaff' }}>
              <td colSpan={3} style={{ ...TD, fontWeight: 600, fontSize: 12.5 }}>Total</td>
              <td style={{ ...TD, textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#7c3aed' }}>
                {formatRupiah(total)}
              </td>
              {!readonly && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── PO Items ────────────────────────────────────────────────
export interface POItem {
  product_code: string;
  product_name: string;
  quantity: string;
  purchase_price: string;
  supplier: string;
  notes: string;
  expired_date: string;
  lot_number: string;
}

interface POItemsProps {
  items: POItem[];
  onChange: (items: POItem[]) => void;
  products?: { product_code: string; product_name: string }[];
  defaultSupplier?: string;
  readonly?: boolean;
}

export function POLineItems({ items, onChange, products = [], defaultSupplier = '', readonly }: POItemsProps) {
  const setItem = (i: number, k: keyof POItem, v: string) =>
    onChange(items.map((x, j) => j === i ? { ...x, [k]: v } : x));

  const addItem = () =>
    onChange([...items, { product_code: '', product_name: '', quantity: '1', purchase_price: '', supplier: defaultSupplier, notes: '', expired_date: '', lot_number: '' }]);

  const removeItem = (i: number) =>
    onChange(items.filter((_, j) => j !== i));

  const total = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.purchase_price) || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-bold" style={{ color: 'var(--color-text)' }}>Item Pembelian</div>
        {!readonly && (
          <button className="btn btn-outline btn-sm" onClick={addItem}>
            <Plus size={11} /> Tambah Item
          </button>
        )}
      </div>
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafaff' }}>
              <th style={TH}>Produk</th>
              <th style={{ ...TH, width: 80, textAlign: 'right' }}>Qty</th>
              <th style={{ ...TH, width: 130, textAlign: 'right' }}>Harga Beli</th>
              <th style={{ ...TH, width: 130, textAlign: 'right' }}>Subtotal</th>
              <th style={{ ...TH, width: 100 }}>Expired</th>
              <th style={{ ...TH, width: 90 }}>Lot No.</th>
              {!readonly && <th style={{ ...TH, width: 36 }} />}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--color-border-soft)' }}>
                <td style={TD}>
                  {readonly ? (
                    <div>
                      <div className="text-[12.5px] font-medium" style={{ color: 'var(--color-text)' }}>{item.product_name}</div>
                      {item.product_code && <div className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{item.product_code}</div>}
                      {item.notes && <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{item.notes}</div>}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {products.length > 0 && (
                        <select className="input" style={{ fontSize: 12 }} value={item.product_code}
                          onChange={(e) => {
                            const p = products.find((x) => x.product_code === e.target.value);
                            onChange(items.map((x, j) => j === i ? { ...x, product_code: e.target.value, product_name: p?.product_name ?? x.product_name } : x));
                          }}>
                          <option value="">Pilih produk</option>
                          {products.map((p) => <option key={p.product_code} value={p.product_code}>{p.product_name}</option>)}
                        </select>
                      )}
                      <input className="input" style={{ fontSize: 12 }} placeholder="Nama produk *"
                        value={item.product_name} onChange={(e) => setItem(i, 'product_name', e.target.value)} />
                      <input className="input" style={{ fontSize: 11.5 }} placeholder="Catatan (opsional)"
                        value={item.notes} onChange={(e) => setItem(i, 'notes', e.target.value)} />
                    </div>
                  )}
                </td>
                <td style={{ ...TD, textAlign: 'right' }}>
                  {readonly ? item.quantity :
                    <input type="number" className="input" style={{ fontSize: 12, textAlign: 'right' }} min="1"
                      value={item.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} />}
                </td>
                <td style={{ ...TD, textAlign: 'right' }}>
                  {readonly ? formatRupiah(Number(item.purchase_price)) :
                    <input type="number" className="input" style={{ fontSize: 12, textAlign: 'right' }} min="0"
                      placeholder="0" value={item.purchase_price} onChange={(e) => setItem(i, 'purchase_price', e.target.value)} />}
                </td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: 'var(--color-text)' }}>
                  {formatRupiah((Number(item.quantity) || 0) * (Number(item.purchase_price) || 0))}
                </td>
                <td style={TD}>
                  {readonly ? (item.expired_date || '-') :
                    <input type="date" className="input" style={{ fontSize: 11.5 }}
                      value={item.expired_date} onChange={(e) => setItem(i, 'expired_date', e.target.value)} />}
                </td>
                <td style={TD}>
                  {readonly ? (item.lot_number || '-') :
                    <input className="input" style={{ fontSize: 11.5 }} placeholder="Lot"
                      value={item.lot_number} onChange={(e) => setItem(i, 'lot_number', e.target.value)} />}
                </td>
                {!readonly && (
                  <td style={{ ...TD, textAlign: 'center' }}>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)}>
                        <Trash2 size={13} style={{ color: '#dc2626' }} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--color-border)', background: '#fafaff' }}>
              <td colSpan={3} style={{ ...TD, fontWeight: 600, fontSize: 12.5 }}>Total</td>
              <td style={{ ...TD, textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#4f46e5' }}>
                {formatRupiah(total)}
              </td>
              <td colSpan={readonly ? 2 : 3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Reimburse Items ─────────────────────────────────────────
export interface ReimburseItem {
  item_date: string;
  description: string;
  amount: string;
  attachment_path: string;
}

interface ReimburseItemsProps {
  items: ReimburseItem[];
  onChange: (items: ReimburseItem[]) => void;
  readonly?: boolean;
}

export function ReimburseLineItems({ items, onChange, readonly }: ReimburseItemsProps) {
  const today = new Date().toISOString().split('T')[0];
  const setItem = (i: number, k: keyof ReimburseItem, v: string) =>
    onChange(items.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const addItem    = () => onChange([...items, { item_date: today, description: '', amount: '', attachment_path: '' }]);
  const removeItem = (i: number) => onChange(items.filter((_, j) => j !== i));
  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-bold" style={{ color: 'var(--color-text)' }}>Item Pengeluaran</div>
        {!readonly && <button className="btn btn-outline btn-sm" onClick={addItem}><Plus size={11} /> Tambah</button>}
      </div>
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafaff' }}>
              <th style={{ ...TH, width: 110 }}>Tanggal</th>
              <th style={TH}>Deskripsi</th>
              <th style={{ ...TH, width: 140, textAlign: 'right' }}>Jumlah</th>
              {!readonly && <th style={{ ...TH, width: 36 }} />}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--color-border-soft)' }}>
                <td style={TD}>
                  {readonly ? <span style={{ fontSize: 12 }}>{item.item_date}</span> :
                    <input type="date" className="input" style={{ fontSize: 12 }} value={item.item_date}
                      onChange={(e) => setItem(i, 'item_date', e.target.value)} />}
                </td>
                <td style={TD}>
                  {readonly ? <span style={{ fontSize: 12.5, color: 'var(--color-text)' }}>{item.description}</span> :
                    <input className="input" style={{ fontSize: 12 }} placeholder="Deskripsi pengeluaran *"
                      value={item.description} onChange={(e) => setItem(i, 'description', e.target.value)} />}
                </td>
                <td style={{ ...TD, textAlign: 'right' }}>
                  {readonly ? <span style={{ fontWeight: 600 }}>{formatRupiah(Number(item.amount))}</span> :
                    <input type="number" className="input" style={{ fontSize: 12, textAlign: 'right' }} min="0"
                      placeholder="0" value={item.amount} onChange={(e) => setItem(i, 'amount', e.target.value)} />}
                </td>
                {!readonly && (
                  <td style={{ ...TD, textAlign: 'center' }}>
                    {items.length > 1 && <button onClick={() => removeItem(i)}><Trash2 size={13} style={{ color: '#dc2626' }} /></button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--color-border)', background: '#fafaff' }}>
              <td colSpan={2} style={{ ...TD, fontWeight: 600, fontSize: 12.5 }}>Total</td>
              <td style={{ ...TD, textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#d97706' }}>
                {formatRupiah(total)}
              </td>
              {!readonly && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── shared styles ────────────────────────────────────────────
const TH: React.CSSProperties = {
  padding: '9px 12px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
};

const TD: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 12.5,
  verticalAlign: 'middle',
};