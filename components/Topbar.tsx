'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Settings, Search, AlertCircle, Clock, X, ExternalLink } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

const BREADCRUMB_MAP: Record<string, string> = {
  '/dashboard':               'Dashboard',
  '/salesorder':              'Sales Order',
  '/purchaseorder':           'Purchase Order',
  '/approval-transactions':   'PO Approval',
  '/deliver-to-client':       'Delivery Order',
  '/invoice-payment':         'Invoice & Payment',
  '/ca-create':               'Buat Cash Advance',
  '/ca-transactions':         'CA Transactions',
  '/ca-approval':             'CA Approval',
  '/ca-settlement':           'CA Settlement',
  '/reimburse-create':        'Buat Reimbursement',
  '/reimburse-approval':      'Reimburse Approval',
  '/bank-accounts':           'Kas & Bank',
  '/bank-reconciliations':    'Rekonsiliasi Bank',
  '/manual-journals':         'Manual Journal',
  '/journals':                'Log Jurnal',
  '/intercompany':            'Intercompany',
  '/chart-of-account':        'Chart of Account',
  '/trial-balance':           'Trial Balance',
  '/general-ledger':          'General Ledger',
  '/income-statement':        'Income Statement',
  '/balance-sheet':           'Balance Sheet',
  '/companies':               'Companies',
  '/customers':               'Customers',
  '/suppliers':               'Suppliers',
  '/products':                'Products',
  '/product-categories':      'Product Categories',
  '/projects':                'Projects',
  '/taxes':                   'Taxes',
  '/rbac':                    'Roles & Permissions',
  '/numbering-sequences':     'Numbering Sequences',
  '/reimbursement-categories':'Reimburse Categories',
  '/system-settings':         'System Settings',
  '/help':                    'User Guide',
  '/accounting-entry':        'Accounting Entry',
};

interface Notif {
  ar_code: string;
  customer_name: string;
  due_date: string;
  outstanding_amount: number;
  status: string;
  so_code: string;
  company_name: string;
  overdue_days: number;
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(s: string) {
  if (!s) return '-';
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const d = new Date(s);
  if (isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Refresh every 5 minutes
const REFRESH_INTERVAL = 5 * 60 * 1000;

export default function Topbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { settings } = useSettings();
  const page     = Object.entries(BREADCRUMB_MAP).find(([k]) => pathname.startsWith(k))?.[1] ?? settings.app_name ?? 'Finance';

  const [notifs, setNotifs]         = useState<Notif[]>([]);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await fetch('/api/invoice-payment/list?notify=1&limit=20', { credentials: 'include' });
      const d = await res.json();
      if (d.success) setNotifs(d.data?.notifications ?? []);
    } catch { /* silent */ }
    finally { setNotifLoading(false); }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, REFRESH_INTERVAL);
    return () => clearInterval(t);
  }, [fetchNotifs]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const overdueCount = notifs.filter(n => n.overdue_days > 0).length;
  const dueSoonCount = notifs.filter(n => n.overdue_days <= 0).length;
  const badgeCount   = notifs.length;

  return (
    <header
      className="flex items-center gap-3 px-6 h-14 flex-shrink-0 border-b"
      style={{ background: '#fff', borderColor: 'var(--color-border)' }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12.5px]">
        <span style={{ color: 'var(--color-text-muted)' }}>{settings.app_name || 'Finance'}</span>
        <span style={{ color: 'var(--color-border)' }}>›</span>
        <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{page}</span>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 ml-4 px-3 py-1.5 rounded-[9px] flex-1 max-w-[240px]"
        style={{ background: '#F9F8FF', border: '1px solid var(--color-border)' }}>
        <Search size={13} style={{ color: 'var(--color-text-muted)' }} />
        <input
          placeholder="Cari order, invoice..."
          className="bg-transparent border-none outline-none text-[12.5px] flex-1"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            className="relative w-8 h-8 rounded-[9px] flex items-center justify-center transition-all hover:bg-purple-50 border"
            style={{ borderColor: 'var(--color-border)' }}
            onClick={() => { setNotifOpen(v => !v); if (!notifOpen) fetchNotifs(); }}
            title={badgeCount > 0 ? `${badgeCount} invoice perlu perhatian` : 'Tidak ada notifikasi'}
          >
            <Bell size={15} style={{ color: 'var(--color-text-secondary)' }} />
            {badgeCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: '#dc2626', fontSize: '9px', padding: '0 3px' }}
              >
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {notifOpen && (
            <div
              className="absolute right-0 top-10 z-[9999] rounded-xl shadow-xl border overflow-hidden"
              style={{
                width: 360,
                background: '#fff',
                borderColor: 'var(--color-border)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <div className="font-semibold text-[13px]" style={{ color: 'var(--color-text)' }}>
                    Invoice Perlu Perhatian
                  </div>
                  {badgeCount > 0 && (
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {overdueCount > 0 && <span className="text-red-600 font-medium">{overdueCount} telat bayar</span>}
                      {overdueCount > 0 && dueSoonCount > 0 && <span className="mx-1">·</span>}
                      {dueSoonCount > 0 && <span className="text-amber-600 font-medium">{dueSoonCount} jatuh tempo 7 hari</span>}
                    </div>
                  )}
                </div>
                <button
                  className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                  onClick={() => setNotifOpen(false)}
                >
                  <X size={13} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
                {notifLoading && (
                  <div className="py-8 text-center text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                    Memuat...
                  </div>
                )}
                {!notifLoading && notifs.length === 0 && (
                  <div className="py-10 text-center">
                    <Bell size={24} className="mx-auto mb-2" style={{ color: 'var(--color-border)' }} />
                    <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                      Tidak ada invoice jatuh tempo
                    </div>
                  </div>
                )}
                {!notifLoading && notifs.map((n) => {
                  const isOverdue = n.overdue_days > 0;
                  return (
                    <div
                      key={n.ar_code}
                      className="flex items-start gap-3 px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition-colors"
                      style={{ borderColor: 'var(--color-border)' }}
                      onClick={() => { setNotifOpen(false); router.push('/invoice-payment'); }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          background: isOverdue ? '#fef2f2' : '#fffbeb',
                          color: isOverdue ? '#dc2626' : '#d97706',
                        }}
                      >
                        {isOverdue
                          ? <AlertCircle size={14} />
                          : <Clock size={14} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold" style={{ color: '#7c3aed' }}>
                            {n.ar_code}
                          </span>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{
                              background: isOverdue ? '#fef2f2' : '#fffbeb',
                              color: isOverdue ? '#dc2626' : '#d97706',
                            }}
                          >
                            {isOverdue
                              ? `${Math.abs(n.overdue_days)}h telat`
                              : n.overdue_days === 0
                                ? 'Hari ini'
                                : `${Math.abs(n.overdue_days)}h lagi`
                            }
                          </span>
                        </div>
                        <div className="text-[12px] font-medium truncate mt-0.5" style={{ color: 'var(--color-text)' }}>
                          {n.customer_name}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                            JT: {formatDate(n.due_date)}
                          </span>
                          <span className="text-[11px] font-semibold" style={{ color: '#dc2626' }}>
                            {formatRupiah(n.outstanding_amount)}
                          </span>
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {n.company_name} · {n.so_code}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              {notifs.length > 0 && (
                <div className="px-4 py-2.5 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <button
                    className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                    style={{ color: '#7c3aed' }}
                    onClick={() => { setNotifOpen(false); router.push('/invoice-payment'); }}
                  >
                    <ExternalLink size={12} />
                    Lihat Semua Invoice
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings */}
        <button className="w-8 h-8 rounded-[9px] flex items-center justify-center transition-all hover:bg-purple-50 border"
          style={{ borderColor: 'var(--color-border)' }}>
          <Settings size={15} style={{ color: 'var(--color-text-secondary)' }} />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white text-[11px] font-bold cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}>
          AD
        </div>
      </div>
    </header>
  );
}
