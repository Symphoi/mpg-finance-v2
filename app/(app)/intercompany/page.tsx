'use client';
import { useState, useEffect, useCallback } from 'react';
import { formatRupiah, formatDate } from '@/lib/utils';
import {
  Building2, ArrowRightLeft, TrendingUp, TrendingDown, Minus,
  RefreshCw, Download, AlertTriangle, CheckCircle2, ChevronDown
} from 'lucide-react';

interface CompanySummary {
  company_code: string;
  company_name: string;
  piutang_interco: number;
  hutang_interco: number;
  net_position: number;
}

interface IntercoTransaction {
  journal_code: string;
  transaction_date: string;
  description: string;
  reference_type: string;
  reference_code: string;
  company_code: string;
  company_name: string;
  total_amount: number;
}

export default function IntercompanyPage() {
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to)   params.set('to',   to);
      const res = await fetch(`/api/reports/intercompany?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function exportCSV() {
    if (!data?.companies?.length) return;
    const rows = [
      ['Perusahaan', 'Piutang Interco', 'Hutang Interco', 'Net Posisi'],
      ...data.companies.map((c: CompanySummary) => [
        c.company_name,
        c.piutang_interco,
        c.hutang_interco,
        c.net_position,
      ]),
    ];
    const csv = rows.map(r => r.map((v: string|number) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'intercompany.csv' });
    a.click();
    URL.revokeObjectURL(url);
  }

  const summary = data?.summary;
  const companies: CompanySummary[] = data?.companies || [];
  const transactions: IntercoTransaction[] = data?.transactions || [];

  const netColor = (v: number) => v > 0 ? '#059669' : v < 0 ? '#dc2626' : '#6b7280';

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>
            Intercompany Reconciliation
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Saldo piutang dan hutang antar perusahaan dalam grup
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={exportCSV}>
            <Download size={13} /> Export CSV
          </button>
          <button className="btn btn-outline btn-sm" onClick={fetchData} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Period Filter */}
      <div className="card p-3">
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="input-label text-[11px]">Dari</label>
            <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="input-label text-[11px]">Sampai</label>
            <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={fetchData}>Terapkan</button>
          <button className="btn btn-outline btn-sm" onClick={() => { setFrom(''); setTo(''); }}>Semua Periode</button>
        </div>
      </div>

      {/* Summary KPI */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Total Piutang Interco',
              value: formatRupiah(summary.total_piutang_interco),
              icon: <TrendingUp size={18} />,
              color: '#059669',
              bg: '#ecfdf5',
              desc: 'Piutang dari perusahaan grup lain',
            },
            {
              label: 'Total Hutang Interco',
              value: formatRupiah(summary.total_hutang_interco),
              icon: <TrendingDown size={18} />,
              color: '#dc2626',
              bg: '#fef2f2',
              desc: 'Hutang kepada perusahaan grup lain',
            },
            {
              label: 'Net Posisi Grup',
              value: formatRupiah(Math.abs(summary.net)),
              icon: <Minus size={18} />,
              color: netColor(summary.net),
              bg: summary.net === 0 ? '#f9fafb' : summary.net > 0 ? '#ecfdf5' : '#fef2f2',
              desc: summary.net === 0
                ? 'Seimbang — tidak ada selisih'
                : summary.net > 0
                  ? 'Net piutang lebih besar'
                  : 'Net hutang lebih besar',
            },
          ].map(s => (
            <div key={s.label} className="card p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
                <div className="flex-1">
                  <div className="text-[11px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
                  <div className="text-[20px] font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{s.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Catatan penting */}
      {summary && summary.net !== 0 && (
        <div className="card p-4 flex items-start gap-3" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="text-[12.5px] font-semibold" style={{ color: '#92400e' }}>
              Saldo Intercompany Tidak Seimbang
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: '#78350f' }}>
              Total piutang interco dan hutang interco dalam grup seharusnya saling menghapus (nol).
              Selisih Rp {formatRupiah(Math.abs(summary.net))} perlu diperiksa — kemungkinan ada transaksi yang belum dijurnal di salah satu perusahaan.
            </div>
          </div>
        </div>
      )}

      {summary && summary.net === 0 && companies.length > 0 && (
        <div className="card p-4 flex items-start gap-3" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
          <CheckCircle2 size={16} style={{ color: '#059669', flexShrink: 0, marginTop: 1 }} />
          <div className="text-[12.5px] font-semibold" style={{ color: '#065f46' }}>
            Saldo Intercompany Seimbang — Tidak Ada Selisih
          </div>
        </div>
      )}

      {/* Per-company balance table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
          <Building2 size={15} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
            Saldo Per Perusahaan
          </span>
        </div>
        {companies.length === 0 ? (
          <div className="py-12 text-center text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
            Belum ada transaksi intercompany
          </div>
        ) : (
          <div className="tbl-wrapper">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Perusahaan</th>
                  <th className="text-right">Piutang Interco</th>
                  <th className="text-right">Hutang Interco</th>
                  <th className="text-right">Net Posisi</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.company_code}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                          {c.company_name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium">{c.company_name}</div>
                          <div className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{c.company_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right font-semibold" style={{ color: c.piutang_interco > 0 ? '#059669' : 'var(--color-text-muted)' }}>
                      {formatRupiah(c.piutang_interco)}
                    </td>
                    <td className="text-right font-semibold" style={{ color: c.hutang_interco > 0 ? '#dc2626' : 'var(--color-text-muted)' }}>
                      {formatRupiah(c.hutang_interco)}
                    </td>
                    <td className="text-right font-bold" style={{ color: netColor(c.net_position) }}>
                      {c.net_position > 0 && '+'}
                      {formatRupiah(c.net_position)}
                    </td>
                    <td>
                      {c.net_position === 0 ? (
                        <span className="badge badge-green">Seimbang</span>
                      ) : c.net_position > 0 ? (
                        <span className="badge badge-blue">Net Piutang</span>
                      ) : (
                        <span className="badge badge-red">Net Hutang</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--color-bg)', fontWeight: 700 }}>
                  <td className="text-[12.5px]">Total Grup</td>
                  <td className="text-right text-[13px]" style={{ color: '#059669' }}>
                    {formatRupiah(summary?.total_piutang_interco || 0)}
                  </td>
                  <td className="text-right text-[13px]" style={{ color: '#dc2626' }}>
                    {formatRupiah(summary?.total_hutang_interco || 0)}
                  </td>
                  <td className="text-right text-[13px]" style={{ color: netColor(summary?.net || 0) }}>
                    {(summary?.net || 0) > 0 && '+'}
                    {formatRupiah(summary?.net || 0)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Transaksi Intercompany */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
          <ArrowRightLeft size={15} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
            Riwayat Transaksi Intercompany
          </span>
          {transactions.length > 0 && (
            <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
              {transactions.length} transaksi
            </span>
          )}
        </div>
        {transactions.length === 0 ? (
          <div className="py-12 text-center text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
            Belum ada transaksi intercompany
          </div>
        ) : (
          <div className="tbl-wrapper">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Jurnal</th>
                  <th>Tanggal</th>
                  <th>Perusahaan</th>
                  <th>Keterangan</th>
                  <th>Referensi</th>
                  <th className="text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.journal_code}>
                    <td><span className="tbl-mono" style={{ color: '#7c3aed' }}>{tx.journal_code}</span></td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(tx.transaction_date)}</td>
                    <td>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: '#ede9fe', color: '#7c3aed' }}>
                        {tx.company_name || tx.company_code || '-'}
                      </span>
                    </td>
                    <td className="text-[12.5px]">{tx.description}</td>
                    <td>
                      {tx.reference_code ? (
                        <span className="tbl-mono text-[11px]" style={{ color: '#6b7280' }}>{tx.reference_code}</span>
                      ) : '-'}
                    </td>
                    <td className="text-right font-semibold">{formatRupiah(tx.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
