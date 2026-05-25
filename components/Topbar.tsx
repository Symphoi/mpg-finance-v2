'use client';
import { usePathname } from 'next/navigation';
import { Bell, Settings, Search } from 'lucide-react';

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
  '/chart-of-account':        'Chart of Account',
  '/accounting-rules':        'Accounting Rules',
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
};

export default function Topbar() {
  const pathname = usePathname();
  const page = Object.entries(BREADCRUMB_MAP).find(([k]) => pathname.startsWith(k))?.[1] ?? 'MPG Finance';

  return (
    <header
      className="flex items-center gap-3 px-6 h-14 flex-shrink-0 border-b"
      style={{ background: '#fff', borderColor: 'var(--color-border)' }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12.5px]">
        <span style={{ color: 'var(--color-text-muted)' }}>MPG Finance</span>
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
        <button className="relative w-8 h-8 rounded-[9px] flex items-center justify-center transition-all hover:bg-purple-50 border"
          style={{ borderColor: 'var(--color-border)' }}>
          <Bell size={15} style={{ color: 'var(--color-text-secondary)' }} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>

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
