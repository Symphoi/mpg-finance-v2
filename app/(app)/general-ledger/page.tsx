'use client';
import { useState, useCallback, useEffect } from 'react';
import { formatRupiah, formatDate } from '@/lib/utils';
import { RefreshCw, Loader2, Printer, Download } from 'lucide-react';

function exportCSV(data: GLData, period: string) {
  if (!data.account) return;
  const rows: string[][] = [
    ['General Ledger', '', `Akun: ${data.account.account_code} — ${data.account.account_name}`, `Periode: ${period}`],
    [''],
    ['Tgl', 'Journal', 'Referensi', 'Kode Ref', 'Keterangan', 'Debit', 'Kredit', 'Saldo'],
    ...data.rows.map(r => [r.transaction_date, r.journal_code, r.reference_type, r.reference_code, r.description, String(r.debit_amount), String(r.credit_amount), String(r.running_balance)]),
    [''],
    ['', '', '', '', 'TOTAL', String(data.total_debit), String(data.total_credit), String(data.ending_balance)],
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `gl-${data.account.account_code}-${period}.csv`; a.click();
  URL.revokeObjectURL(url);
}

interface GLRow {
  journal_code: string;
  transaction_date: string;
  description: string;
  reference_type: string;
  reference_code: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
}

interface GLData {
  accounts: { account_code: string; account_name: string; account_type: string }[];
  account: { account_code: string; account_name: string; account_type: string } | null;
  from_date: string;
  to_date: string;
  rows: GLRow[];
  total_debit: number;
  total_credit: number;
  ending_balance: number;
}

const REF_LABEL: Record<string, string> = {
  sales_order: 'SO', purchase_order: 'PO', cash_advance: 'CA',
  reimbursement: 'Reimburse', payment: 'Bayar', receipt: 'Terima', adjustment: 'Adj',
};
const REF_COLOR: Record<string, string> = {
  sales_order: '#5521b5', purchase_order: '#92400e', cash_advance: '#1a56db',
  reimbursement: '#0891b2', payment: '#057a55', receipt: '#059669', adjustment: '#6b7280',
};

export default function GeneralLedgerPage() {
  const [data, setData]           = useState<GLData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [accountCode, setAccount] = useState('');
  const [period, setPeriod]       = useState(() => {
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
      if (accountCode) p.set('account_code', accountCode);
      const res  = await fetch(`/api/reports/general-ledger?${p}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally { setLoading(false); }
  }, [period, from, to, accountCode]);

  // Load accounts on mount
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const periodLabel = from && to ? `${from} s/d ${to}` : `Periode ${period}`;

  return (
    <div className="space-y-4 max-w-[1100px]" id="general-ledger-content">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Buku Besar (General Ledger)</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {data?.account ? `${data.account.account_code} — ${data.account.account_name}` : 'Pilih akun'}
            &nbsp;·&nbsp;{periodLabel}
          </p>
        </div>
        <div className="flex gap-2 no-print">
          {data?.account && data.rows.length > 0 && (
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
          <div className="flex-1 min-w-[220px]">
            <label className="input-label">Akun COA *</label>
            <select className="input" value={accountCode} onChange={e => setAccount(e.target.value)}>
              <option value="">-- Pilih Akun --</option>
              {(data?.accounts ?? []).map(a => (
                <option key={a.account_code} value={a.account_code}>
                  {a.account_code} — {a.account_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Periode</label>
            <input type="month" className="input" value={period}
              onChange={e => { setPeriod(e.target.value); setFrom(''); setTo(''); }} />
          </div>
          <span className="text-[11px] self-center" style={{ color: 'var(--color-text-muted)' }}>atau</span>
          <div>
            <label className="input-label">Dari</label>
            <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Sampai</label>
            <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={load} disabled={loading || !accountCode}>
            Tampilkan
          </button>
        </div>
      </div>

      {loading && (
        <div className="card p-10 flex items-center justify-center gap-3">
          <Loader2 size={20} className="animate-spin" style={{ color: '#1a56db' }} />
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Memuat data...</span>
        </div>
      )}

      {!loading && !accountCode && (
        <div className="card p-10 text-center" style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
          Pilih akun COA untuk melihat buku besar
        </div>
      )}

      {!loading && data && data.account && (
        <>
          {/* Account info */}
          <div className="card p-4" style={{ background: '#f5f3ff', border: '1px solid #e9d5ff' }}>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-mono text-[13px] font-bold" style={{ color: '#7c3aed' }}>
                  {data.account.account_code}
                </div>
                <div className="font-semibold text-[15px]" style={{ color: 'var(--color-text)' }}>
                  {data.account.account_name}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: '#9ca3af' }}>
                  Tipe: {data.account.account_type} · {periodLabel}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px]" style={{ color: '#9ca3af' }}>Saldo Akhir</div>
                <div className="text-[20px] font-bold font-mono" style={{ color: data.ending_balance >= 0 ? '#057a55' : '#c81e1e' }}>
                  {formatRupiah(Math.abs(data.ending_balance))}
                  {data.ending_balance < 0 && <span className="text-[13px] ml-1">(K)</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Ledger table */}
          <div className="card overflow-hidden">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#f5f4f0', borderBottom: '2px solid #e2e0d8' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.5px', width: 110 }}>Tanggal</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kode Journal</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Keterangan</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.5px', width: 90 }}>Referensi</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Debit</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kredit</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#7a7870', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                      Tidak ada transaksi pada periode ini
                    </td>
                  </tr>
                )}
                {data.rows.map((r, i) => {
                  const refColor = REF_COLOR[r.reference_type] ?? '#6b7280';
                  return (
                    <tr key={`${r.journal_code}-${i}`} style={{ borderBottom: '1px solid #f0efe9', background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                      <td style={{ padding: '7px 14px', color: 'var(--color-text-muted)' }}>{formatDate(r.transaction_date)}</td>
                      <td style={{ padding: '7px 14px', fontFamily: 'monospace', fontSize: 11.5, color: '#7c3aed' }}>{r.journal_code}</td>
                      <td style={{ padding: '7px 14px', color: 'var(--color-text)', maxWidth: 280 }}>
                        <div className="truncate">{r.description}</div>
                        {r.reference_code && (
                          <div className="font-mono text-[10.5px]" style={{ color: '#9ca3af' }}>{r.reference_code}</div>
                        )}
                      </td>
                      <td style={{ padding: '7px 14px' }}>
                        <span style={{ display: 'inline-flex', padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: `${refColor}18`, color: refColor }}>
                          {REF_LABEL[r.reference_type] ?? r.reference_type}
                        </span>
                      </td>
                      <td style={{ padding: '7px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: r.debit_amount > 0 ? 600 : 400, color: r.debit_amount > 0 ? '#1a56db' : '#d1d5db' }}>
                        {r.debit_amount > 0 ? formatRupiah(r.debit_amount) : '-'}
                      </td>
                      <td style={{ padding: '7px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: r.credit_amount > 0 ? 600 : 400, color: r.credit_amount > 0 ? '#c81e1e' : '#d1d5db' }}>
                        {r.credit_amount > 0 ? formatRupiah(r.credit_amount) : '-'}
                      </td>
                      <td style={{ padding: '7px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: r.running_balance >= 0 ? '#057a55' : '#c81e1e' }}>
                        {formatRupiah(Math.abs(r.running_balance))}{r.running_balance < 0 ? ' (K)' : ''}
                      </td>
                    </tr>
                  );
                })}

                {/* Totals */}
                <tr style={{ background: '#1a1917', borderTop: '2px solid #e2e0d8' }}>
                  <td colSpan={4} style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#fff' }}>TOTAL</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#93c5fd' }}>{formatRupiah(data.total_debit)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>{formatRupiah(data.total_credit)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: data.ending_balance >= 0 ? '#86efac' : '#fca5a5' }}>
                    {formatRupiah(Math.abs(data.ending_balance))}{data.ending_balance < 0 ? ' (K)' : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
