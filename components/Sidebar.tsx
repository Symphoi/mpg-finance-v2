'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, FileText, ShoppingCart, CheckSquare, Truck, FileCheck,
  Wallet, Receipt, Calculator, Building, Users, Package, Shield, Percent,
  ListOrdered, Tag, ChevronDown, Settings, LogOut, Bell, Search,
  BookOpen, GitBranch, Landmark, Scale, AlertCircle, X, TrendingUp
} from 'lucide-react';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: { label: string; href: string }[];
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Sales & Procurement', icon: FileText,
    children: [
      { label: 'Sales Order',         href: '/salesorder' },
      { label: 'Purchase Order',       href: '/purchaseorder' },
      { label: 'PO Approval',          href: '/approval-transactions' },
      { label: 'Delivery Order',       href: '/deliver-to-client' },
      { label: 'Invoice & Payment',    href: '/invoice-payment' },
    ],
  },
  {
    label: 'Investasi', icon: TrendingUp,
    children: [
      { label: 'Komoditas', href: '/commodity-investments' },
    ],
  },
  {
    label: 'Cash Advance', icon: Wallet,
    children: [
      { label: 'Buat CA',       href: '/ca-create' },
      { label: 'CA Transaksi',  href: '/ca-transactions' },
      { label: 'CA Approval',   href: '/ca-approval' },
      { label: 'CA Settlement', href: '/ca-settlement' },
    ],
  },
  {
    label: 'Reimbursement', icon: Receipt,
    children: [
      { label: 'Buat Reimburse',   href: '/reimburse-create' },
      { label: 'Approval',         href: '/reimburse-approval' },
    ],
  },
  {
    label: 'Akuntansi', icon: Calculator,
    children: [
      { label: 'Kas & Bank',          href: '/bank-accounts' },
      { label: 'Rekonsiliasi',        href: '/bank-reconciliations' },
      { label: 'Accounting Entry',     href: '/accounting-entry' },
      { label: 'Manual Journal',      href: '/manual-journals' },
      { label: 'Log Jurnal',          href: '/journals' },
      { label: 'Intercompany',        href: '/intercompany' },
      { label: 'Chart of Account',    href: '/chart-of-account' },
      { label: 'Accounting Rules',    href: '/accounting-rules' },
    ],
  },
  {
    label: 'Laporan', icon: BookOpen,
    children: [
      { label: 'Trial Balance',       href: '/trial-balance' },
      { label: 'General Ledger',      href: '/general-ledger' },
      { label: 'Income Statement',    href: '/income-statement' },
      { label: 'Balance Sheet',       href: '/balance-sheet' },
    ],
  },
];

const MASTER_NAV: NavItem[] = [
  {
    label: 'Perusahaan', icon: Building,
    children: [
      { label: 'Companies', href: '/companies' },
      { label: 'Projects',  href: '/projects' },
    ],
  },
  {
    label: 'People & Produk', icon: Users,
    children: [
      { label: 'Customers',           href: '/customers' },
      { label: 'Suppliers',           href: '/suppliers' },
      { label: 'Products',            href: '/products' },
      { label: 'Product Categories',  href: '/product-categories' },
    ],
  },
];

const SETTINGS_NAV: NavItem[] = [
  { label: 'Roles & Permissions',     href: '/rbac',                      icon: Shield },
  { label: 'Taxes',                   href: '/taxes',                     icon: Percent },
  { label: 'Numbering Sequences',     href: '/numbering-sequences',       icon: ListOrdered },
  { label: 'Reimburse Categories',    href: '/reimbursement-categories',  icon: Tag },
];

function NavGroup({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isChildActive = item.children?.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState(!!isChildActive);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2.5 px-4 py-2 mx-2 rounded-[10px] text-left transition-all
          ${isChildActive ? 'text-white/90' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
        style={{ width: 'calc(100% - 16px)' }}
      >
        <item.icon size={15} className={isChildActive ? 'text-purple-400' : 'text-white/30'} />
        <span className="text-[12.5px] font-medium flex-1">{item.label}</span>
        <ChevronDown size={12} className={`transition-transform text-white/30 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="ml-8 mt-0.5 mb-1 space-y-0.5">
          {item.children?.map((child) => {
            const active = pathname === child.href || pathname.startsWith(child.href + '/');
            return (
              <Link
                key={child.href}
                href={child.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition-all
                  ${active
                    ? 'text-purple-300 bg-purple-500/15'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
              >
                <span className={`w-1 h-1 rounded-full bg-current opacity-60`} />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  if (!item.href) return <NavGroup item={item} />;
  const active = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 px-4 py-2 mx-2 rounded-[10px] text-[12.5px] font-medium transition-all
        ${active
          ? 'bg-gradient-to-r from-purple-500/30 to-indigo-500/30 text-white border border-purple-500/25'
          : 'text-white/55 hover:text-white/90 hover:bg-white/7'
        }`}
      style={{ width: 'calc(100% - 16px)' }}
    >
      <item.icon size={15} className={active ? 'text-purple-300' : 'text-white/30'} />
      {item.label}
    </Link>
  );
}

export default function Sidebar() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/login');
  };

  return (
    <aside
      className="flex flex-col flex-shrink-0 overflow-hidden"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--sidebar-bg)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/8">
        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#a855f7,#6366f1)' }}>
          M
        </div>
        <div>
          <div className="text-white font-semibold text-[14px] leading-tight">MPG Finance</div>
          <div className="text-white/35 text-[10px]">v2.0 · Management</div>
        </div>
      </div>

      {/* Nav scroll */}
      <nav className="flex-1 overflow-y-auto py-2.5 space-y-0.5"
        style={{ scrollbarWidth: 'none' }}>

        <div className="px-5 pt-2 pb-1 text-[9px] font-semibold tracking-widest uppercase text-white/25">Main</div>
        {NAV.slice(0,1).map((item) => <NavItem key={item.label} item={item} />)}

        <div className="px-5 pt-3 pb-1 text-[9px] font-semibold tracking-widest uppercase text-white/25">Transaksi</div>
        {NAV.slice(1).map((item) => <NavItem key={item.label} item={item} />)}

        <div className="px-5 pt-3 pb-1 text-[9px] font-semibold tracking-widest uppercase text-white/25">Master Data</div>
        {MASTER_NAV.map((item) => <NavItem key={item.label} item={item} />)}

        <div className="px-5 pt-3 pb-1 text-[9px] font-semibold tracking-widest uppercase text-white/25">Settings</div>
        {SETTINGS_NAV.map((item) => <NavItem key={item.label} item={item} />)}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/8">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 p-2.5 rounded-[10px] hover:bg-white/6 transition-all group text-left"
        >
          <div className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}>
            AD
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-[12.5px] font-medium truncate">Admin User</div>
            <div className="text-white/35 text-[10.5px]">Klik untuk keluar</div>
          </div>
          <LogOut size={14} className="text-white/25 group-hover:text-red-400 transition-colors" />
        </button>
      </div>
    </aside>
  );
}
