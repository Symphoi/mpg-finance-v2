'use client';
import { useState, useCallback, useEffect } from 'react';
import { formatRupiah } from '@/lib/utils';
import { RefreshCw, Loader2, Printer, Download, CheckCircle2, AlertCircle } from 'lucide-react';

interface BSRow {
  account_code: string;
  account_name: string;
  account_type: string;
  balance: number;
}

interface BSData {
  from_date: string;
  to_date: string;
  assets: BSRow[];
  liabilities: BSRow[];
  equity: BSRow[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  net_income: number;
  is_balanced: boolean;
}

const fmt = (n: number) => formatRupiah(Math.abs(n));

function exportCSV(data: BSData, period: string) {
  const isProfit = data.net_income >= 0;
  const rows: string[][] = [
    ['Neraca (Balance Sheet)', '', `Periode: ${period}`],
    [''],
    ['Kategori', 'Kode Akun', 'Nama Akun', 'Jumlah'],
    ...data.assets.map(r => ['Aset', r.account_code, r.account_name, String(r.balance)]),
    ['', '', 'Total Aset', String(data.total_assets)],
    [''],
    ...data.liabilities.map(r => ['Liabilitas', r.account_code, r.account_name, String(r.balance)]),
    ['', '', 'Total Liabilitas', String(data.total_liabilities)],
    [''],
    ...data.equity.map(r => ['Ekuitas', r.account_code, r.account_name, String(r.balance)]),
    ['', '', isProfit ? 'Laba Berjalan' : 'Rugi Berjalan', String(data.net_income)],
    ['', '', 'Total Ekuitas', String(data.total_equity + data.net_income)],
    [''],
    ['', '', 'TOTAL LIABILITAS + EKUITAS', String(data.total_liabilities + data.total_equity + data.net_income)],
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `balance-sheet-${period}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function BalanceSheetPage() {
  const [data, setData]       = useState<BSData | null>(null);
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
      const res  = await fetch(`/api/reports/balance-sheet?${p}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally { setLoading(false); }
  }, [period, from, to]);

  useEffect(() => { load(); }, [load]);

  const periodLabel  = from && to ? `${from} s/d ${to}` : `Periode ${period}`;
  const isProfit     = (data?.net_income ?? 0) >= 0;
  const totalRightSide = (data?.total_liabilities ?? 0) + (data?.total_equity ?? 0) + (data?.net_income ?? 0);

  function Section({ title, rows, total, color, bg }: { title: string; rows: BSRow[]; total: number; color: string; bg: string }) {
    return (
      <>
        <tr style={{ background: bg, borderTop: '2px solid #e2e0d8' }}>
          <td colSpan={3} style={{ padding: '7px 16px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color }}>
            {title}
          </td>
        </tr>
        {rows.map((r, i) => (
          <tr key={r.account_code} style={{ borderBottom: '1px solid #f0efe9', background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
            <td style={{ padding: '7px 16px', fontFamily: 'monospace', fontSize: 12, color: '#9ca3af' }}>{r.account_code}</td>
            <td style={{ padding: '7px 16px', color: 'var(--color-text)' }}>{r.account_name}</td>
            <td style={{ padding: '7px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, color }}>{fmt(r.balance)}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={3} style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>Tidak ada data</td></tr>
        )}
        <tr style={{ background: bg, borderTop: '1px solid #e2e0d8', borderBottom: '2px solid #e2e0d8' }}>
          <td colSpan={2} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, color }}>Total {title}</td>
          <td style={{ padding: '8px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color }}>{fmt(total)}</td>
        </tr>
      </>
    );
  }

  return (
    <div className="space-y-4 max-w-[900px]" id="bs-content">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Balance Sheet</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Neraca Keuangan — {periodLabel}</p>
        </div>
        <div className="flex gap-2 no-print">
          {data && (
            <button className="btn btn-outline btn-sm" onClick={() => exportCSV(data, from && to ? `${from}_${to}` : period)}>
              <Download size={12} /> Export CSV
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
              {data.is_balanced
                ? 'Neraca Seimbang — Aset = Liabilitas + Ekuitas'
                : 'Neraca Tidak Seimbang — Periksa Journal!'}
            </span>
          </div>

          {/* KPI row */}
          <div className="flex gap-3">
            {[
              { label: 'Total Aset',      value: data.total_assets,      color: '#1a56db', bg: '#eff5ff' },
              { label: 'Total Liabilitas', value: data.total_liabilities, color: '#c81e1e', bg: '#fdf2f2' },
              { label: 'Total Ekuitas',   value: data.total_equity + data.net_income, color: '#057a55', bg: '#f0fdf4' },
            ].map(k => (
              <div key={k.label} className="flex-1 p-4 rounded-xl" style={{ background: k.bg, border: `1px solid ${k.color}30` }}>
                <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: k.color }}>{k.label}</div>
                <div className="text-[20px] font-bold" style={{ color: k.color, fontVariantNumeric: 'tabular-nums' }}>{fmt(k.value)}</div>
              </div>
            ))}
          </div>

          {/* Tables side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Assets */}
            <div className="card overflow-hidden">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f5f4f0', borderBottom: '2px solid #e2e0d8' }}>
                    <th colSpan={3} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#1a56db' }}>ASET</th>
                  </tr>
                  <tr style={{ background: '#f5f4f0' }}>
                    <th style={{ padding: '6px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase' }}>Kode</th>
                    <th style={{ padding: '6px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase' }}>Nama Akun</th>
                    <th style={{ padding: '6px 16px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase' }}>Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  <Section title="Aset" rows={data.assets} total={data.total_assets} color="#1a56db" bg="#eff5ff" />
                  <tr style={{ background: '#1a1f3c' }}>
                    <td colSpan={2} style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: '#fff' }}>TOTAL ASET</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#93c5fd' }}>{fmt(data.total_assets)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Liabilities + Equity */}
            <div className="card overflow-hidden">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f5f4f0', borderBottom: '2px solid #e2e0d8' }}>
                    <th colSpan={3} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#c81e1e' }}>LIABILITAS & EKUITAS</th>
                  </tr>
                  <tr style={{ background: '#f5f4f0' }}>
                    <th style={{ padding: '6px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase' }}>Kode</th>
                    <th style={{ padding: '6px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase' }}>Nama Akun</th>
                    <th style={{ padding: '6px 16px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase' }}>Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  <Section title="Liabilitas" rows={data.liabilities} total={data.total_liabilities} color="#c81e1e" bg="#fdf2f2" />
                  <Section title="Ekuitas" rows={data.equity} total={data.total_equity} color="#057a55" bg="#f0fdf4" />
                  {/* Net income row */}
                  <tr style={{ background: isProfit ? '#f0fdf4' : '#fdf2f2', borderTop: '1px solid #e2e0d8', borderBottom: '2px solid #e2e0d8' }}>
                    <td colSpan={2} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, color: isProfit ? '#057a55' : '#c81e1e' }}>
                      {isProfit ? '+ Laba Berjalan' : '– Rugi Berjalan'}
                    </td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: isProfit ? '#057a55' : '#c81e1e' }}>
                      {isProfit ? '' : '('}{fmt(data.net_income)}{isProfit ? '' : ')'}
                    </td>
                  </tr>
                  <tr style={{ background: '#1a1917' }}>
                    <td colSpan={2} style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: '#fff' }}>TOTAL LIABILITAS + EKUITAS</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: data.is_balanced ? '#86efac' : '#fca5a5' }}>
                      {fmt(totalRightSide)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] no-print" style={{ color: 'var(--color-text-muted)' }}>
            * Ekuitas final = Ekuitas + Laba/Rugi Berjalan periode {periodLabel}.
          </p>
        </>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .grid { display: block !important; }
        }
      `}</style>
    </div>
  );
}
