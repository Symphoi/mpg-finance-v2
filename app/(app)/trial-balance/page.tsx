'use client';
import { useState, useCallback, useEffect } from 'react';
import { formatRupiah, exportExcel } from '@/lib/utils';
import { RefreshCw, Loader2, CheckCircle2, AlertCircle, Printer, Download } from 'lucide-react';

async function doExportExcel(data: TBData, period: string) {
  const rows: (string | number)[][] = [
    ['Trial Balance', '', '', '', `Periode: ${period}`],
    [],
    ['Kode Akun', 'Nama Akun', 'Tipe', 'Debit', 'Kredit', 'Saldo'],
    ...data.rows.map(r => [r.account_code, r.account_name, r.account_type, r.total_debit, r.total_credit, r.balance]),
    [],
    ['', '', 'TOTAL', data.total_debit, data.total_credit, ''],
  ];
  await exportExcel(rows, `trial-balance-${period}`, 'Trial Balance');
}

interface TBRow {
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

interface TBData {
  from_date: string;
  to_date: string;
  rows: TBRow[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  asset: 'Aset', liability: 'Liabilitas', equity: 'Ekuitas',
  revenue: 'Pendapatan', expense: 'Beban',
};
const TYPE_COLOR: Record<string, string> = {
  asset: '#1a56db', liability: '#c81e1e', equity: '#057a55',
  revenue: '#5521b5', expense: '#92400e',
};
const TYPE_BG: Record<string, string> = {
  asset: '#eff5ff', liability: '#fdf2f2', equity: '#f0fdf4',
  revenue: '#f5f3ff', expense: '#fffbeb',
};

export default function TrialBalancePage() {
  const [data, setData]     = useState<TBData | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  });
  const [from, setFrom]     = useState('');
  const [to, setTo]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (from && to) { p.set('from', from); p.set('to', to); }
      else { p.set('period', period); }
      const res  = await fetch(`/api/reports/trial-balance?${p}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally { setLoading(false); }
  }, [period, from, to]);

  useEffect(() => { load(); }, [load]);

  const grouped = (data?.rows ?? []).reduce<Record<string, TBRow[]>>((acc, r) => {
    (acc[r.account_type] = acc[r.account_type] ?? []).push(r);
    return acc;
  }, {});

  const periodLabel = from && to ? `${from} s/d ${to}` : `Periode ${period}`;

  return (
    <div className="space-y-4 max-w-[1000px]" id="trial-balance-content">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Trial Balance</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Neraca Saldo — {periodLabel}</p>
        </div>
        <div className="flex gap-2 no-print">
          {data && (
            <button className="btn btn-outline btn-sm" onClick={() => doExportExcel(data, from && to ? `${from}_${to}` : period)}>
              <Download size={12} /> Export Excel
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
            <Printer size={12} /> Print / PDF
          </button>
          <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Refresh
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="card p-3 no-print">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="input-label">Periode (Bulan)</label>
            <input type="month" className="input" value={period}
              onChange={e => { setPeriod(e.target.value); setFrom(''); setTo(''); }} />
          </div>
          <span className="text-[11px] self-center" style={{ color: 'var(--color-text-muted)' }}>atau</span>
          <div>
            <label className="input-label">Dari Tanggal</label>
            <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Sampai</label>
            <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={load} disabled={loading}>Tampilkan</button>
        </div>
      </div>

      {loading && (
        <div className="card p-10 flex items-center justify-center gap-3">
          <Loader2 size={20} className="animate-spin" style={{ color: '#1a56db' }} />
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Memuat data...</span>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Balance status */}
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{
            background: data.is_balanced ? '#f0fdf4' : '#fdf2f2',
            border: `1px solid ${data.is_balanced ? '#a7f3d0' : '#fca5a5'}`,
          }}>
            {data.is_balanced
              ? <CheckCircle2 size={16} style={{ color: '#059669' }} />
              : <AlertCircle  size={16} style={{ color: '#dc2626' }} />
            }
            <span className="text-[13px] font-semibold" style={{ color: data.is_balanced ? '#065f46' : '#7f1d1d' }}>
              {data.is_balanced ? 'Neraca Seimbang (Debit = Kredit)' : 'Neraca Tidak Seimbang — Periksa Journal!'}
            </span>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f5f4f0', borderBottom: '2px solid #e2e0d8' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kode</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nama Akun</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Debit</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kredit</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([type, rows]) => {
                  const color = TYPE_COLOR[type] ?? '#1a1917';
                  const bg    = TYPE_BG[type]    ?? '#f9f8f5';
                  const subtotalDebit  = rows.reduce((s, r) => s + r.total_debit, 0);
                  const subtotalCredit = rows.reduce((s, r) => s + r.total_credit, 0);
                  const subtotalBal    = rows.reduce((s, r) => s + r.balance, 0);
                  return [
                    // Group header
                    <tr key={`h-${type}`} style={{ background: bg, borderTop: '2px solid #e2e0d8' }}>
                      <td colSpan={5} style={{ padding: '7px 16px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color }}>
                        {TYPE_LABEL[type] ?? type}
                      </td>
                    </tr>,
                    // Rows
                    ...rows.map((r, i) => (
                      <tr key={r.account_code} style={{ borderBottom: '1px solid #f0efe9', background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                        <td style={{ padding: '7px 16px', fontFamily: 'monospace', fontSize: 12, color: '#9ca3af' }}>{r.account_code}</td>
                        <td style={{ padding: '7px 16px', color: 'var(--color-text)' }}>{r.account_name}</td>
                        <td style={{ padding: '7px 16px', textAlign: 'right', fontFamily: 'monospace', color: r.total_debit > 0 ? '#1a56db' : '#9ca3af' }}>
                          {r.total_debit > 0 ? formatRupiah(r.total_debit) : '-'}
                        </td>
                        <td style={{ padding: '7px 16px', textAlign: 'right', fontFamily: 'monospace', color: r.total_credit > 0 ? '#c81e1e' : '#9ca3af' }}>
                          {r.total_credit > 0 ? formatRupiah(r.total_credit) : '-'}
                        </td>
                        <td style={{ padding: '7px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: r.balance >= 0 ? '#057a55' : '#c81e1e' }}>
                          {formatRupiah(Math.abs(r.balance))} {r.balance < 0 ? '(K)' : ''}
                        </td>
                      </tr>
                    )),
                    // Subtotal
                    <tr key={`sub-${type}`} style={{ background: bg, borderTop: '1px solid #e2e0d8', borderBottom: '2px solid #e2e0d8' }}>
                      <td colSpan={2} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, color }}>Subtotal {TYPE_LABEL[type] ?? type}</td>
                      <td style={{ padding: '7px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#1a56db' }}>{formatRupiah(subtotalDebit)}</td>
                      <td style={{ padding: '7px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#c81e1e' }}>{formatRupiah(subtotalCredit)}</td>
                      <td style={{ padding: '7px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color }}>{formatRupiah(Math.abs(subtotalBal))}</td>
                    </tr>,
                  ];
                })}

                {/* Grand Total */}
                <tr style={{ background: '#1a1917' }}>
                  <td colSpan={2} style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#fff' }}>TOTAL</td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#93c5fd' }}>{formatRupiah(data.total_debit)}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>{formatRupiah(data.total_credit)}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: data.is_balanced ? '#86efac' : '#fca5a5' }}>
                    {data.is_balanced ? 'SEIMBANG' : formatRupiah(Math.abs(data.total_debit - data.total_credit))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            * Menampilkan {data.rows.length} akun aktif dengan transaksi pada periode {periodLabel}.
            Saldo (K) = saldo kredit.
          </p>
        </>
      )}

      <style>{`
        @media print {
          #trial-balance-content { max-width: 100% !important; }

          /* Table: force print sizes, override inline styles */
          #trial-balance-content table {
            font-size: 9px !important;
            width: 100% !important;
          }
          #trial-balance-content table thead {
            display: table-header-group !important;
          }
          #trial-balance-content table tr {
            break-inside: avoid !important;
          }
          #trial-balance-content table th,
          #trial-balance-content table td {
            padding: 4px 8px !important;
            font-size: 9px !important;
          }
          /* Grand total row: print dark bg */
          #trial-balance-content table tr:last-child {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Group subtotal rows */
          #trial-balance-content .card {
            break-inside: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
