// ============================================================
// MPG Finance v2 — Utility Functions
// Single source of truth. Import from here, NEVER inline format.
// ============================================================

/** Format number as Rupiah: Rp 1.234.567 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

/** Format compact: Rp 1,5 Jt / Rp 2,3 M */
export function formatRupiahCompact(amount: number | null | undefined): string {
  if (!amount) return 'Rp 0';
  const n = Number(amount);
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace('.', ',')} Jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} Rb`;
  return `Rp ${n}`;
}

/** Format date: 23 Mei 2025 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format date-time: 23 Mei 2025, 14:30 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

/** Relative time: "3 jam lalu", "2 hari lalu" */
export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} hari lalu`;
  return formatDate(dateStr);
}

// ============================================================
// Status Labels — maps DB enum values to human-readable labels
// ============================================================

export const SO_STATUS: Record<string, { label: string; color: string }> = {
  submitted:  { label: 'Submitted',  color: 'amber'  },
  processing: { label: 'Processing', color: 'blue'   },
  invoicing:  { label: 'Invoicing',  color: 'purple' },
  completed:  { label: 'Completed',  color: 'green'  },
  cancelled:  { label: 'Cancelled',  color: 'red'    },
};

export const PO_STATUS: Record<string, { label: string; color: string }> = {
  submitted:    { label: 'Menunggu SPV',     color: 'amber'  },
  approved_spv: { label: 'Disetujui SPV',    color: 'blue'   },
  approved:     { label: 'Disetujui Finance', color: 'purple' },
  paid:         { label: 'Dibayar',           color: 'green'  },
  rejected:     { label: 'Ditolak',           color: 'red'    },
};

export const CA_STATUS: Record<string, { label: string; color: string }> = {
  submitted:      { label: 'Menunggu',        color: 'amber'  },
  approved:       { label: 'Disetujui',       color: 'blue'   },
  active:         { label: 'Aktif',           color: 'purple' },
  in_settlement:  { label: 'Settlement',      color: 'cyan'   },
  completed:      { label: 'Selesai',         color: 'green'  },
  partially_used: { label: 'Sebagian Pakai',  color: 'blue'   },
  fully_used:     { label: 'Terpakai Semua',  color: 'green'  },
  draft:          { label: 'Draft',           color: 'gray'   },
  rejected:       { label: 'Ditolak',         color: 'red'    },
};

export const REIMBURSE_STATUS: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Menunggu',   color: 'amber' },
  approved:  { label: 'Disetujui', color: 'green' },
  rejected:  { label: 'Ditolak',   color: 'red'   },
};

export const DO_STATUS: Record<string, { label: string; color: string }> = {
  shipping:  { label: 'Dikirim',   color: 'blue'  },
  delivered: { label: 'Diterima',  color: 'green' },
  cancelled: { label: 'Dibatalkan', color: 'red'  },
};

export function getStatusBadge(status: string, map: Record<string, { label: string; color: string }>) {
  return map[status] ?? { label: status, color: 'gray' };
}

// ============================================================
// Misc helpers
// ============================================================

/** Truncate string */
export function truncate(str: string, max = 40): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

/** Get initials from name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Build pagination info */
export function paginationInfo(page: number, limit: number, total: number) {
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const totalPages = Math.ceil(total / limit);
  return { from, to, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}
