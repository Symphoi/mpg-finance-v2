'use client';
import { useState, useCallback, useEffect } from 'react';
import { formatRupiah, exportExcel } from '@/lib/utils';
import { RefreshCw, Loader2, Printer, Download, TrendingUp, TrendingDown } from 'lucide-react';

interface ISRow {
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

interface ISData {
  from_date: string;
  to_date: string;
  revenues: ISRow[];
  expenses: ISRow[];
  total_revenue: number;
  total_expense: number;
  net_income: number;
}

const fmt = (n: number) => formatRupiah(Math.abs(n));

async function doExportExcel(data: ISData, period: string) {
  const rows: (string | number)[][] = [
    ['Laporan Laba Rugi', '', '', `Periode: ${period}`],
    [],
    ['Tipe', 'Kode Akun', 'Nama Akun', 'Jumlah'],
    ...data.revenues.map(r => ['Pendapatan', r.account_code, r.account_name, r.balance]),
    ['', '', 'Total Pendapatan', data.total_revenue],
    [],
    ...data.expenses.map(r => ['Beban', r.account_code, r.account_name, r.balance]),
    ['', '', 'Total Beban', data.total_expense],
    [],
    ['', '', 'LABA / RUGI BERSIH', data.net_income],
  ];
  await exportExcel(rows, `income-statement-${period}`, 'Laba Rugi');
}

export default function IncomeStatementPage() {
  const [data, setData]       = useState<ISData | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod]   = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  });
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (from && to) { p.set('from', from); p.set('to', to); }
      else { p.set('period', period); }
      const res  = await fetch(`/api/reports/income-statement?${p}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally { setLoading(false); }
  }, [period, from, to]);

  useEffect(() => { load(); }, [load]);

  const periodLabel = from && to ? `${from} s/d ${to}` : `Periode ${period}`;
  const isProfit    = (data?.net_income ?? 0) >= 0;

  return (
    <div className="space-y-4 max-w-[800px]" id="is-content">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Income Statement</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Laporan Laba Rugi — {periodLabel}</p>
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
          {/* Net Income Card */}
          <div className="flex gap-3">
            <div className="flex-1 p-4 rounded-xl" style={{ background: isProfit ? '#f0fdf4' : '#fdf2f2', border: `1px solid ${isProfit ? '#a7f3d0' : '#fca5a5'}` }}>
              <div className="flex items-center gap-2 mb-1">
                {isProfit ? <TrendingUp size={16} style={{ color: '#059669' }} /> : <TrendingDown size={16} style={{ color: '#dc2626' }} />}
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: isProfit ? '#059669' : '#dc2626' }}>
                  {isProfit ? 'Laba Bersih' : 'Rugi Bersih'}
                </span>
              </div>
              <div className="text-[24px] font-bold" style={{ color: isProfit ? '#057a55' : '#c81e1e', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(data.net_income)}
              </div>
              <div className="text-[11px] mt-1" style={{ color: isProfit ? '#057a55' : '#c81e1e', opacity: 0.7 }}>
                Margin: {data.total_revenue > 0 ? ((data.net_income / data.total_revenue) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="flex-1 p-4 rounded-xl" style={{ background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
              <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#5521b5' }}>Total Pendapatan</div>
              <div className="text-[22px] font-bold" style={{ color: '#5521b5', fontVariantNumeric: 'tabular-nums' }}>{fmt(data.total_revenue)}</div>
              <div className="text-[11px] mt-1" style={{ color: '#5521b5', opacity: 0.7 }}>{data.revenues.length} akun pendapatan</div>
            </div>
            <div className="flex-1 p-4 rounded-xl" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <div className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#92400e' }}>Total Beban</div>
              <div className="text-[22px] font-bold" style={{ color: '#92400e', fontVariantNumeric: 'tabular-nums' }}>{fmt(data.total_expense)}</div>
              <div className="text-[11px] mt-1" style={{ color: '#92400e', opacity: 0.7 }}>{data.expenses.length} akun beban</div>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f5f4f0', borderBottom: '2px solid #e2e0d8' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kode</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nama Akun</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {/* Revenue section */}
                <tr style={{ background: '#f5f3ff', borderTop: '2px solid #e2e0d8' }}>
                  <td colSpan={3} style={{ padding: '7px 16px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#5521b5' }}>
                    Pendapatan
                  </td>
                </tr>
                {data.revenues.map((r, i) => (
                  <tr key={r.account_code} style={{ borderBottom: '1px solid #f0efe9', background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                    <td style={{ padding: '7px 16px', fontFamily: 'monospace', fontSize: 12, color: '#9ca3af' }}>{r.account_code}</td>
                    <td style={{ padding: '7px 16px', color: 'var(--color-text)' }}>{r.account_name}</td>
                    <td style={{ padding: '7px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, color: '#5521b5' }}>{fmt(r.balance)}</td>
                  </tr>
                ))}
                {data.revenues.length === 0 && (
                  <tr><td colSpan={3} style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>Belum ada transaksi pendapatan</td></tr>
                )}
                <tr style={{ background: '#f5f3ff', borderTop: '1px solid #e2e0d8', borderBottom: '2px solid #e2e0d8' }}>
                  <td colSpan={2} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, color: '#5521b5' }}>Total Pendapatan</td>
                  <td style={{ padding: '8px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#5521b5' }}>{fmt(data.total_revenue)}</td>
                </tr>

                {/* Expense section */}
                <tr style={{ background: '#fffbeb', borderTop: '2px solid #e2e0d8' }}>
                  <td colSpan={3} style={{ padding: '7px 16px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#92400e' }}>
                    Beban / Pengeluaran
                  </td>
                </tr>
                {data.expenses.map((r, i) => (
                  <tr key={r.account_code} style={{ borderBottom: '1px solid #f0efe9', background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                    <td style={{ padding: '7px 16px', fontFamily: 'monospace', fontSize: 12, color: '#9ca3af' }}>{r.account_code}</td>
                    <td style={{ padding: '7px 16px', color: 'var(--color-text)' }}>{r.account_name}</td>
                    <td style={{ padding: '7px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, color: '#92400e' }}>{fmt(r.balance)}</td>
                  </tr>
                ))}
                {data.expenses.length === 0 && (
                  <tr><td colSpan={3} style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>Belum ada transaksi beban</td></tr>
                )}
                <tr style={{ background: '#fffbeb', borderTop: '1px solid #e2e0d8', borderBottom: '2px solid #e2e0d8' }}>
                  <td colSpan={2} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, color: '#92400e' }}>Total Beban</td>
                  <td style={{ padding: '8px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#92400e' }}>{fmt(data.total_expense)}</td>
                </tr>

                {/* Net Income row */}
                <tr style={{ background: isProfit ? '#1a4731' : '#7f1d1d' }}>
                  <td colSpan={2} style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    {isProfit ? 'LABA BERSIH' : 'RUGI BERSIH'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                    {isProfit ? '' : '('}{fmt(data.net_income)}{isProfit ? '' : ')'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[11px] no-print" style={{ color: 'var(--color-text-muted)' }}>
            * Hanya menampilkan akun dengan aktivitas pada periode {periodLabel}.
          </p>
        </>
      )}

      <style>{`
        @media print {
          #is-content { max-width: 100% !important; }
          #is-content table {
            font-size: 9px !important;
            width: 100% !important;
          }
          #is-content table thead { display: table-header-group !important; }
          #is-content table tr    { break-inside: avoid !important; }
          #is-content table th,
          #is-content table td    { padding: 4px 8px !important; font-size: 9px !important; }
          #is-content table tr:last-child {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
