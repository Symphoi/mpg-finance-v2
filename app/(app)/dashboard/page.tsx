'use client';
import { useState, useEffect, useCallback } from 'react';
import { formatRupiahCompact, formatDate } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Building2, Banknote, PieChart,
  RefreshCw, Download, Loader2, ChevronDown, CheckCircle2, AlertCircle,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ConsolidatedData {
  period: string;
  from_date: string | null;
  to_date: string | null;
  company_code: string;
  companies: { company_code: string; name: string }[];
  balance_sheet: {
    data: AccountRow[];
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
    net_income: number;
  };
  income_statement: {
    data: AccountRow[];
    total_revenue: number;
    total_expense: number;
    net_income: number;
  };
  intercompany_elimination: {
    total_debit: number;
    total_credit: number;
  };
}

interface AccountRow {
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  company_code?: string;
}

type ActiveTab = 'overview' | 'balance_sheet' | 'income_statement';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) => formatRupiahCompact(Math.abs(n || 0));

// ─── KPI Card ───────────────────────────────────────────────────────────────

const VARIANT = {
  purple: { accent: '#7C3AED', text: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  red:    { accent: '#DC2626', text: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  green:  { accent: '#059669', text: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  indigo: { accent: '#4F46E5', text: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE' },
};

function KPICard({ label, value, sub, trend, variant }: {
  label: string;
  value: string;
  sub?: string;
  trend?: number | null;
  variant: keyof typeof VARIANT;
}) {
  const v = VARIANT[variant];
  const positive = (trend ?? 0) >= 0;
  return (
    <div style={{
      background: '#fff',
      border: `1px solid #EAE8FF`,
      borderRadius: 14,
      padding: '18px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: 4, height: '100%',
        background: v.accent, borderRadius: '4px 0 0 4px',
      }} />
      <div style={{
        fontSize: 10.5, fontWeight: 600, color: '#A5A3C8',
        textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 700, letterSpacing: '-0.8px',
        color: v.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{
        marginTop: 10, paddingTop: 10,
        borderTop: '1px solid #F3F1FF',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {trend != null && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 8px', borderRadius: 20, fontSize: 10.5, fontWeight: 600,
            background: positive ? v.bg : '#FEF2F2',
            color: positive ? v.text : '#DC2626',
            border: `1px solid ${positive ? v.border : '#FECACA'}`,
          }}>
            {positive ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {sub && <span style={{ fontSize: 10.5, color: '#A5A3C8' }}>{sub}</span>}
      </div>
    </div>
  );
}

// ─── Account Table ──────────────────────────────────────────────────────────

const GROUP_STYLE = {
  asset:     { label: 'Aset',       color: '#7C3AED', bg: '#F5F3FF' },
  liability: { label: 'Liabilitas', color: '#DC2626', bg: '#FEF2F2' },
  equity:    { label: 'Ekuitas',    color: '#059669', bg: '#ECFDF5' },
  revenue:   { label: 'Pendapatan', color: '#4F46E5', bg: '#EEF2FF' },
  expense:   { label: 'Beban',      color: '#B45309', bg: '#FFFBEB' },
};

function AccountTable({
  title, subtitle, badge, groups, grandTotalLabel, grandTotalValue
}: {
  title: string;
  subtitle: string;
  badge?: { label: string; color: string; bg: string; border: string };
  groups: { type: keyof typeof GROUP_STYLE; rows: AccountRow[]; total: number }[];
  grandTotalLabel: string;
  grandTotalValue: number;
}) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{
        padding: '14px 18px 12px',
        borderBottom: '1px solid #EAE8FF',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1E1B4B' }}>{title}</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{subtitle}</div>
        </div>
        {badge && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 20,
            fontSize: 10.5, fontWeight: 600,
            background: badge.bg, color: badge.color,
            border: `1px solid ${badge.border}`,
          }}>
            {badge.label}
          </span>
        )}
      </div>
      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
        {groups.map(({ type, rows, total }) => {
          const g = GROUP_STYLE[type];
          if (!g || rows.length === 0) return null;
          return (
            <div key={type}>
              <div style={{
                padding: '7px 18px',
                fontSize: 10.5, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.6px',
                color: g.color, background: '#FAFAFF',
                borderBottom: '1px solid #EAE8FF',
              }}>
                {g.label}
              </div>
              {rows.map((row, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 18px', borderBottom: '1px solid #F3F1FF', fontSize: 12,
                }}>
                  <span style={{ color: '#374151' }}>
                    <span style={{
                      color: '#A5A3C8', fontSize: 10.5,
                      fontFamily: "'Fira Code', monospace", marginRight: 6,
                    }}>
                      {row.account_code}
                    </span>
                    {row.account_name}
                  </span>
                  <span style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 11.5, fontWeight: 500,
                    color: row.balance >= 0 ? '#059669' : '#DC2626',
                    whiteSpace: 'nowrap',
                  }}>
                    {fmt(row.balance)}
                  </span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '9px 18px', fontSize: 12, fontWeight: 600,
                background: g.bg,
                borderTop: '1px solid #EAE8FF', borderBottom: '1px solid #EAE8FF',
              }}>
                <span style={{ color: g.color }}>Total {g.label}</span>
                <span style={{ fontFamily: "'Fira Code', monospace", color: g.color }}>{fmt(total)}</span>
              </div>
            </div>
          );
        })}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '12px 18px', fontSize: 13, fontWeight: 700,
          background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
          color: '#fff',
        }}>
          <span>{grandTotalLabel}</span>
          <span style={{ fontFamily: "'Fira Code', monospace" }}>{fmt(grandTotalValue)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConsolidatedData | null>(null);
  const [tab, setTab] = useState<ActiveTab>('overview');
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const AUTO_REFRESH_MS = 5 * 60 * 1000;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate && toDate) {
        params.append('from_date', fromDate);
        params.append('to_date', toDate);
      } else {
        params.append('period', period);
      }
      if (companyFilter) params.append('company', companyFilter);
      const res = await fetch(`/api/dashboard?${params}`);
      const d = await res.json();
      if (d.success) { setData(d.data); setLastUpdated(new Date()); }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [period, fromDate, toDate, companyFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const id = setInterval(() => { fetchData(); }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  const periodLabel = fromDate && toDate
    ? `${formatDate(fromDate)} – ${formatDate(toDate)}`
    : `Periode ${period.split('-')[1]}/${period.split('-')[0]}`;

  const companies = data?.companies ?? [];
  const selectedCompanyName = companies.find(c => c.company_code === companyFilter)?.name ?? 'Semua Perusahaan';

  const bs = data?.balance_sheet;
  const is_ = data?.income_statement;
  const elim = data?.intercompany_elimination;
  const isProfit = (is_?.net_income ?? 0) >= 0;
  const elimBalanced = Math.abs((elim?.total_debit ?? 0) - (elim?.total_credit ?? 0)) < 1;

  const totalEquityWithNetIncome = (bs?.total_equity ?? 0) + (bs?.net_income ?? 0);
  const totalLiabilitiesAndEquity = (bs?.total_liabilities ?? 0) + totalEquityWithNetIncome;
  const isBalanced = Math.abs((bs?.total_assets ?? 0) - totalLiabilitiesAndEquity) < 1;
  const netIncomeValue = bs?.net_income ?? is_?.net_income ?? 0;

  const TAB_LABELS = { overview: 'Overview', balance_sheet: 'Neraca', income_statement: 'Laba Rugi' };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.4px', color: '#1E1B4B' }}>
              Laporan Keuangan Konsolidasi
            </h1>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              {periodLabel}
              <span style={{ color: '#DDD6FE' }}>·</span>
              {selectedCompanyName}
              {data && (
                <span className="badge badge-purple">
                  {companies.length} entitas
                </span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {lastUpdated && !loading && (
              <span style={{ fontSize: 10.5, color: '#A5A3C8' }}>
                Diperbarui {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button className="btn btn-outline btn-sm" onClick={fetchData} disabled={loading}>
              {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {loading ? 'Memuat...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="card" style={{ padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
            className="input text-[12px] py-1.5"
            style={{ width: 190 }}
          >
            <option value="">Semua Perusahaan</option>
            {companies.map(c => (
              <option key={c.company_code} value={c.company_code}>{c.name}</option>
            ))}
          </select>

          <div style={{ width: 1, height: 22, background: '#EAE8FF', flexShrink: 0 }} />

          <input
            type="month"
            value={period}
            onChange={e => { setPeriod(e.target.value); setFromDate(''); setToDate(''); }}
            className="input text-[12px] py-1.5"
            style={{ width: 148 }}
          />

          <span style={{ fontSize: 11, color: '#A5A3C8', flexShrink: 0 }}>atau</span>

          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="input text-[12px] py-1.5"
            style={{ width: 140 }}
          />
          <span style={{ fontSize: 12, color: '#A5A3C8', flexShrink: 0 }}>–</span>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="input text-[12px] py-1.5"
            style={{ width: 140 }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 16,
        background: '#F5F3FF',
        border: '1px solid #EAE8FF',
        borderRadius: 10, padding: 3, width: 'fit-content',
      }}>
        {(['overview', 'balance_sheet', 'income_statement'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '5px 16px', borderRadius: 7, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', border: 'none', transition: '0.15s',
            background: tab === t ? '#fff' : 'transparent',
            color: tab === t ? '#7C3AED' : '#6B7280',
            boxShadow: tab === t ? '0 1px 4px rgba(124,58,237,0.12)' : 'none',
            fontFamily: 'inherit',
          }}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {loading && (
        <div className="card p-10 flex items-center justify-center gap-3">
          <Loader2 size={20} className="animate-spin" style={{ color: '#7C3AED' }} />
          <span style={{ fontSize: 13, color: '#6B7280' }}>Memuat data konsolidasi...</span>
        </div>
      )}

      {!loading && data && bs && is_ && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <KPICard label="Total Aset"      value={fmt(bs.total_assets)}           variant="purple" />
            <KPICard label="Total Liabilitas" value={fmt(bs.total_liabilities)}       variant="red" />
            <KPICard label="Total Ekuitas"   value={fmt(totalEquityWithNetIncome)}   sub="termasuk Laba/Rugi Berjalan" variant="green" />
            <KPICard label="Laba Bersih"     value={fmt(is_.net_income)}             sub={isProfit ? 'Laba' : 'Rugi'} variant={isProfit ? 'indigo' : 'red'} />
          </div>

          {/* Tab: Overview or Balance Sheet */}
          {(tab === 'overview' || tab === 'balance_sheet') && (
            <div style={{
              display: tab === 'overview' ? 'grid' : 'block',
              gridTemplateColumns: tab === 'overview' ? '1fr 1fr' : undefined,
              gap: 12, marginBottom: 12,
            }}>
              <AccountTable
                title="Neraca (Balance Sheet)"
                subtitle={`Per ${periodLabel}`}
                badge={isBalanced
                  ? { label: '✓ Balanced', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' }
                  : { label: '! Unbalanced', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' }
                }
                groups={[
                  { type: 'asset',     rows: bs.data.filter(r => r.account_type === 'asset'),     total: bs.total_assets },
                  { type: 'liability', rows: bs.data.filter(r => r.account_type === 'liability'), total: bs.total_liabilities },
                  {
                    type: 'equity',
                    rows: [
                      ...bs.data.filter(r => r.account_type === 'equity'),
                      ...(netIncomeValue !== 0 ? [{
                        account_code: '--',
                        account_name: 'Laba/Rugi Berjalan',
                        account_type: 'equity' as const,
                        balance: netIncomeValue,
                      }] : []),
                    ],
                    total: totalEquityWithNetIncome,
                  },
                ]}
                grandTotalLabel="TOTAL ASET"
                grandTotalValue={bs.total_assets}
              />

              {tab === 'overview' && (
                <AccountTable
                  title="Laba Rugi (Income Statement)"
                  subtitle={`Periode ${periodLabel}`}
                  badge={isProfit
                    ? { label: 'Laba', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' }
                    : { label: 'Rugi', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' }
                  }
                  groups={[
                    { type: 'revenue', rows: is_.data.filter(r => r.account_type === 'revenue'), total: is_.total_revenue },
                    { type: 'expense', rows: is_.data.filter(r => r.account_type === 'expense'), total: is_.total_expense },
                  ]}
                  grandTotalLabel="LABA BERSIH"
                  grandTotalValue={is_.net_income}
                />
              )}
            </div>
          )}

          {/* Tab: Income Statement only */}
          {tab === 'income_statement' && (
            <div style={{ marginBottom: 12 }}>
              <AccountTable
                title="Laba Rugi (Income Statement)"
                subtitle={`Periode ${periodLabel}`}
                badge={isProfit
                  ? { label: 'Laba', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' }
                  : { label: 'Rugi', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' }
                }
                groups={[
                  { type: 'revenue', rows: is_.data.filter(r => r.account_type === 'revenue'), total: is_.total_revenue },
                  { type: 'expense', rows: is_.data.filter(r => r.account_type === 'expense'), total: is_.total_expense },
                ]}
                grandTotalLabel="LABA BERSIH"
                grandTotalValue={is_.net_income}
              />
            </div>
          )}

          {/* Intercompany Elimination */}
          <div className="card" style={{ padding: '16px 20px', marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1E1B4B' }}>
                  {companyFilter ? 'Posisi Intercompany' : 'Eliminasi Intercompany'}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                  {companyFilter
                    ? `Saldo akun interco milik ${selectedCompanyName}`
                    : 'Eliminasi transaksi antar entitas dalam konsolidasi'}
                </div>
              </div>
              {companyFilter
                ? <span className="badge badge-purple">Per Perusahaan</span>
                : elimBalanced
                  ? <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={11} /> Balanced
                    </span>
                  : <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={11} /> Selisih!
                    </span>
              }
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: companyFilter ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
              {companyFilter ? (
                <>
                  <div style={{ background: '#ECFDF5', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                      Piutang Interco (1150)
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Fira Code', monospace", color: '#059669' }}>
                      {fmt(elim?.total_debit ?? 0)}
                    </div>
                  </div>
                  <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                      Hutang Interco (2150)
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Fira Code', monospace", color: '#DC2626' }}>
                      {fmt(elim?.total_credit ?? 0)}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {[
                    { label: 'Eliminasi Debit',   val: elim?.total_debit ?? 0,  color: '#059669', bg: '#ECFDF5' },
                    { label: 'Eliminasi Kredit',  val: elim?.total_credit ?? 0, color: '#DC2626', bg: '#FEF2F2' },
                    { label: 'Selisih (harus 0)',
                      val: Math.abs((elim?.total_debit ?? 0) - (elim?.total_credit ?? 0)),
                      color: elimBalanced ? '#059669' : '#DC2626',
                      bg: elimBalanced ? '#ECFDF5' : '#FEF2F2',
                    },
                  ].map(({ label, val, color, bg }) => (
                    <div key={label} style={{ background: bg, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 10.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Fira Code', monospace", color }}>
                        {fmt(val)}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #EAE8FF', fontSize: 10.5, color: '#A5A3C8', lineHeight: 1.6 }}>
              {companyFilter
                ? '* Saldo akun 1150 (Piutang Interco) dan 2150 (Hutang Interco) milik perusahaan ini. Eliminasi hanya berlaku pada laporan konsolidasi.'
                : '* Mencakup: Piutang Inter-Co (akun 1150) dan Hutang Inter-Co (akun 2150) antar entitas konsolidasi'}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
