'use client';
import { useEffect, useState } from 'react';
import { formatRupiah, formatRupiahCompact, formatRelativeTime, SO_STATUS, PO_STATUS, CA_STATUS, REIMBURSE_STATUS } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, FileText, ShoppingCart, AlertCircle, Truck, Wallet, RefreshCw, Download, ArrowRight, Bell } from 'lucide-react';

interface DashboardData {
  financial: { revenue: number; expense: number; grossProfit: number; margin: number; totalAR: number };
  operational: { soActive: number; poPendingSPV: number; poPendingFinance: number; reimbursePending: number; doInTransit: number; caOutstanding: number };
  cashFlow: { month_label: string; revenue: number; expense: number }[];
  ca: { outstanding: number; pendingApproval: number; siapDikembalikan: number };
  recentActivity: { type: string; code: string; party: string; amount: number; status: string; created_at: string }[];
  topCustomers: { customer_name: string; order_count: number; total_value: number }[];
  pendingAlerts: { alert_type: string; ref_code: string; party: string; amount: number; days_waiting: number }[];
  deliveries: { do_code: string; so_code: string; courier: string; status: string; shipping_date: string }[];
}

interface Company {
  company_code: string;
  name: string;
}

const TYPE_COLOR: Record<string, string> = {
  SO: '#7c3aed', PO: '#4f46e5', CA: '#059669', RMB: '#d97706',
};

const AVATAR_COLORS = [
  ['#f5f3ff','#7c3aed'], ['#eef2ff','#4f46e5'], ['#ecfeff','#0891b2'],
  ['#ecfdf5','#059669'], ['#fffbeb','#d97706'],
];

function StatCard({ label, value, sub, trend, trendDir, icon: Icon, accent }: {
  label: string; value: string; sub?: string; trend?: string; trendDir?: 'up'|'down'|'flat';
  icon: React.ElementType; accent: string;
}) {
  const TrendIcon = trendDir === 'up' ? TrendingUp : trendDir === 'down' ? TrendingDown : Minus;
  const trendColor = trendDir === 'up' ? '#059669' : trendDir === 'down' ? '#dc2626' : '#2563eb';
  const trendBg   = trendDir === 'up' ? '#ecfdf5' : trendDir === 'down' ? '#fef2f2' : '#eff6ff';

  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-[0.06]" style={{ background: accent }} />
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-[11px] flex items-center justify-center" style={{ background: accent + '18', color: accent }}>
          <Icon size={17} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold" style={{ background: trendBg, color: trendColor }}>
            <TrendIcon size={9} />
            {trend}
          </div>
        )}
      </div>
      <div className="text-[20px] font-bold" style={{ color: 'var(--color-text)' }}>{value}</div>
      <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      {sub && <div className="text-[10.5px] mt-1.5 pt-1.5 border-t" style={{ borderColor: 'var(--color-border-soft)', color: 'var(--color-text-muted)' }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now]                 = useState(new Date());
  
  // Filter states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const monthName = months[now.getMonth()];

  // Fetch companies list
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch('/api/companies?limit=100', {
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success) {
          setCompanies(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch companies:', err);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('month', String(now.getMonth() + 1));
      params.set('year', String(now.getFullYear()));
      if (selectedCompany) {
        params.set('company', selectedCompany);
      }
      
      const res = await fetch(`/api/dashboard?${params.toString()}`, {
        credentials: 'include',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        window.location.replace('/login');
        return;
      }
      setData(json.data);
    } catch (e) {
      window.location.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  // Reload when company filter changes
  useEffect(() => {
    load();
  }, [selectedCompany]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  const f  = data?.financial;
  const op = data?.operational;

  const maxCF = Math.max(...(data?.cashFlow ?? []).map((c) => Math.max(Number(c.revenue), Number(c.expense))), 1);

  // Get selected company name for display
  const selectedCompanyName = companies.find(c => c.company_code === selectedCompany)?.name;

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Header with company filter */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Dashboard</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })} · {monthName} {now.getFullYear()}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Company Filter Dropdown */}
          <select
            className="input input-sm"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            disabled={loadingCompanies}
            style={{ minWidth: '200px' }}
          >
            <option value="">Semua Perusahaan</option>
            {companies.map((comp) => (
              <option key={comp.company_code} value={comp.company_code}>
                {comp.name}
              </option>
            ))}
          </select>
          
          <button className="btn btn-outline btn-sm" onClick={load}>
            <RefreshCw size={12} /> Refresh
          </button>
          <button className="btn btn-outline btn-sm">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      {/* Active filter indicator */}
      {selectedCompany && selectedCompanyName && (
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--color-bg-soft)' }}>
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            Menampilkan data untuk:{' '}
            <span className="font-medium" style={{ color: 'var(--color-primary)' }}>
              {selectedCompanyName}
            </span>
          </span>
          <button 
            className="text-[10px] hover:underline ml-1" 
            onClick={() => setSelectedCompany('')}
            style={{ color: 'var(--color-primary)' }}
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Financial KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label={`Revenue ${monthName}`} value={formatRupiahCompact(f?.revenue)} trend="+12.4%" trendDir="up"
          sub="Target Rp 300 Jt · 82% tercapai" icon={TrendingUp} accent="#7c3aed" />
        <StatCard label={`Total Expense ${monthName}`} value={formatRupiahCompact(f?.expense)} trend="-3.1%" trendDir="down"
          sub={`PO: ${formatRupiahCompact((f?.expense ?? 0) * 0.77)} · Reimburse: ${formatRupiahCompact((f?.expense ?? 0) * 0.23)}`} icon={ShoppingCart} accent="#4f46e5" />
        <StatCard label="Gross Profit" value={formatRupiahCompact(f?.grossProfit)} trend={`${f?.margin ?? 0}%`} trendDir="up"
          sub={`Margin ${f?.margin ?? 0}% bulan ini`} icon={TrendingUp} accent="#059669" />
        <StatCard label="Outstanding AR" value={formatRupiahCompact(f?.totalAR)} trendDir="flat"
          sub="3 invoice overdue > 30 hari" icon={AlertCircle} accent="#d97706" />
      </div>

      {/* Operational Strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'SO Aktif',             val: op?.soActive ?? 0,          color: '#7c3aed', bg: '#f5f3ff',  icon: FileText },
          { label: 'PO Tunggu SPV',        val: op?.poPendingSPV ?? 0,       color: '#d97706', bg: '#fffbeb',  icon: ShoppingCart },
          { label: 'PO Tunggu Finance',    val: op?.poPendingFinance ?? 0,   color: '#2563eb', bg: '#eff6ff',  icon: ShoppingCart },
          { label: 'Reimburse Pending',    val: op?.reimbursePending ?? 0,   color: '#dc2626', bg: '#fef2f2',  icon: AlertCircle },
          { label: 'DO In Transit',        val: op?.doInTransit ?? 0,        color: '#0891b2', bg: '#ecfeff',  icon: Truck },
        ].map((item) => (
          <div key={item.label} className="card p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0" style={{ background: item.bg, color: item.color }}>
              <item.icon size={15} />
            </div>
            <div>
              <div className="text-[16px] font-bold" style={{ color: item.color }}>{item.val}</div>
              <div className="text-[10.5px]" style={{ color: 'var(--color-text-muted)' }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Row: Chart + Alerts */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 320px' }}>
        {/* Cash Flow Chart */}
        <div className="card p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[13px] font-bold" style={{ color: 'var(--color-text)' }}>Cash Flow — 6 Bulan Terakhir</div>
              <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Revenue masuk vs expense keluar</div>
            </div>
            <button className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--color-primary)' }}>
              Detail <ArrowRight size={11} />
            </button>
          </div>

          {/* Bars */}
          <div className="flex items-flex-end gap-1.5" style={{ height: 120, alignItems: 'flex-end' }}>
            <div className="flex flex-col justify-between h-full pr-2" style={{ minWidth: 36 }}>
              {['Max','50%','0'].map((l) => <span key={l} className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{l}</span>)}
            </div>
            {(data?.cashFlow ?? []).map((c, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="flex gap-1 items-end w-full">
                  <div className="flex-1 rounded-t-[3px] transition-all hover:opacity-80"
                    style={{ height: `${(Number(c.revenue) / maxCF) * 110}px`, background: '#7c3aed', minHeight: 2 }} />
                  <div className="flex-1 rounded-t-[3px] transition-all hover:opacity-80"
                    style={{ height: `${(Number(c.expense) / maxCF) * 110}px`, background: '#a5b4fc', minHeight: 2 }} />
                </div>
                <div className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{c.month_label}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-soft)' }}>
            {[['#7c3aed','Revenue'],['#a5b4fc','Expense']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: c }} /> {l}
              </div>
            ))}
          </div>

          {/* CA Strip */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border-soft)' }}>
            <div className="text-[12.5px] font-bold mb-2.5" style={{ color: 'var(--color-text)' }}>Cash Advance & Reimbursement</div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'CA Outstanding',       val: data?.ca.outstanding,       color: '#7c3aed', pct: 65 },
                { label: 'Reimburse Pending',    val: op?.reimbursePending,       color: '#4f46e5', pct: 35, isCount: true },
                { label: 'CA Siap Dikembalikan', val: data?.ca.siapDikembalikan,  color: '#059669', pct: 20 },
              ].map((c) => (
                <div key={c.label} className="rounded-xl p-3" style={{ background: '#f9f8ff' }}>
                  <div className="text-[14px] font-bold" style={{ color: c.color }}>
                    {c.isCount ? c.val : formatRupiahCompact(c.val as number)}
                  </div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{c.label}</div>
                  <div className="mt-2 h-1 rounded-full" style={{ background: 'var(--color-border)' }}>
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[13px] font-bold" style={{ color: 'var(--color-text)' }}>Butuh Perhatian</div>
              <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Items yang perlu action segera</div>
            </div>
            <div className="px-2 py-0.5 rounded-full text-[10.5px] font-bold" style={{ background: '#fee2e2', color: '#dc2626' }}>
              {data?.pendingAlerts?.length ?? 0}
            </div>
          </div>
          <div className="space-y-2">
            {(data?.pendingAlerts ?? []).slice(0, 6).map((alert, i) => {
              const isUrgent = alert.days_waiting > 2;
              const isWarn   = alert.days_waiting > 0;
              const bg    = isUrgent ? '#fff8f8' : isWarn ? '#fffdf0' : '#f0f9ff';
              const border = isUrgent ? '#fecaca' : isWarn ? '#fde68a' : '#bae6fd';
              const iconBg = isUrgent ? '#fee2e2' : isWarn ? '#fef3c7' : '#dbeafe';
              const iconC  = isUrgent ? '#dc2626' : isWarn ? '#d97706' : '#2563eb';

              return (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-[10px] border cursor-pointer hover:opacity-90 transition-all"
                  style={{ background: bg, borderColor: border }}>
                  <div className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0" style={{ background: iconBg, color: iconC }}>
                    <Bell size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-semibold truncate" style={{ color: 'var(--color-text)' }}>{alert.ref_code}</div>
                    <div className="text-[10.5px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {alert.party} · {formatRupiahCompact(alert.amount)}
                    </div>
                  </div>
                  <div className="text-[10px] flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                    {alert.days_waiting}h
                  </div>
                </div>
              );
            })}
            {(!data?.pendingAlerts || data.pendingAlerts.length === 0) && (
              <div className="text-center py-6 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                Tidak ada alert
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Top Customers */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-bold" style={{ color: 'var(--color-text)' }}>Top Customers</div>
            <button className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-primary)' }}>Semua <ArrowRight size={11} /></button>
          </div>
          <div className="space-y-1">
            {(data?.topCustomers ?? []).length === 0 && (
              <div className="text-center py-6 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                Tidak ada data customer
              </div>
            )}
            {(data?.topCustomers ?? []).map((c, i) => {
              const maxVal = data?.topCustomers[0]?.total_value ?? 1;
              const [bg, color] = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <div key={i} className="flex items-center gap-2.5 py-2" style={{ borderBottom: i < (data?.topCustomers.length ?? 0) - 1 ? '1px solid var(--color-border-soft)' : 'none' }}>
                  <div className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: bg, color }}>
                    {c.customer_name.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium truncate" style={{ color: 'var(--color-text)' }}>{c.customer_name}</div>
                    <div className="text-[10.5px]" style={{ color: 'var(--color-text-muted)' }}>{c.order_count} orders</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>{formatRupiahCompact(c.total_value)}</div>
                    <div className="mt-1 w-14 h-1 rounded-full" style={{ background: 'var(--color-border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(c.total_value / maxVal) * 100}%`, background: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-bold" style={{ color: 'var(--color-text)' }}>Aktivitas Terbaru</div>
            <button className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-primary)' }}>Semua <ArrowRight size={11} /></button>
          </div>
          <div className="space-y-0">
            {(data?.recentActivity ?? []).length === 0 && (
              <div className="text-center py-6 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                Tidak ada aktivitas
              </div>
            )}
            {(data?.recentActivity ?? []).slice(0, 7).map((act, i) => (
              <div key={i} className="flex items-start gap-2.5 py-2.5" style={{ borderBottom: i < 6 ? '1px solid var(--color-border-soft)' : 'none' }}>
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: TYPE_COLOR[act.type] ?? '#9ca3af' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] leading-snug" style={{ color: '#374151' }}>
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{act.code}</span>
                    {' · '}{act.party}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-medium" style={{ color: TYPE_COLOR[act.type] }}>{formatRupiahCompact(act.amount)}</span>
                    <span className="text-[10.5px]" style={{ color: 'var(--color-text-muted)' }}>{formatRelativeTime(act.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Status */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-bold" style={{ color: 'var(--color-text)' }}>Status Pengiriman</div>
            <button className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-primary)' }}>Semua <ArrowRight size={11} /></button>
          </div>
          <div className="space-y-0">
            {(data?.deliveries ?? []).length === 0 && (
              <div className="text-center py-6 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>Tidak ada pengiriman aktif</div>
            )}
            {(data?.deliveries ?? []).map((d, i) => (
              <div key={i} className="flex items-center justify-between py-2.5" style={{ borderBottom: i < (data?.deliveries.length ?? 0) - 1 ? '1px solid var(--color-border-soft)' : 'none' }}>
                <div className="min-w-0">
                  <div className="text-[11px] font-mono" style={{ color: '#7c3aed' }}>{d.do_code}</div>
                  <div className="text-[12px] font-medium truncate" style={{ color: 'var(--color-text)' }}>{d.so_code}</div>
                  <div className="text-[10.5px]" style={{ color: 'var(--color-text-muted)' }}>{d.courier || '-'}</div>
                </div>
                <div className="text-right ml-3">
                  <div className={`badge ${d.status === 'shipped' ? 'badge-purple' : 'badge-blue'}`}>
                    {d.status === 'shipped' ? 'Dikirim' : 'Dibuat'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}