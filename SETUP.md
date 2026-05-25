# MPG Finance v2 — Setup Guide

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: MySQL 8 via `mysql2/promise` (connection pool)
- **Auth**: JWT di httpOnly cookie (bukan localStorage)
- **UI**: Tailwind CSS + Plus Jakarta Sans + Lucide icons
- **Toast**: Sonner

---

## Quick Start

```bash
# 1. Clone & install
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env dengan nilai yang benar

# 3. Jalankan dev server
npm run dev
```

---

## Struktur Project

```
app/
├── (app)/layout.tsx      ← Shell layout (sidebar + topbar)
├── api/                  ← API routes (semua pakai withAuth middleware)
│   ├── auth/login/       ← POST /api/auth/login
│   ├── auth/logout/      ← POST /api/auth/logout
│   ├── dashboard/        ← GET /api/dashboard
│   ├── sales-orders/     ← GET/POST /api/sales-orders
│   ├── purchase-orders/  ← GET/POST /api/purchase-orders
│   │   └── ?action=dropdowns  ← untuk form dropdown (BUKAN OPTIONS method)
│   ├── approval-transactions/ ← GET/POST approve/reject PO
│   ├── cash-advances/    ← GET/POST + ?action=dropdowns
│   ├── ca-approval/      ← GET/POST approve/reject CA
│   ├── ca-settlement/    ← GET/POST settlement CA
│   ├── reimbursements/   ← GET/POST + [code]/approve + [code]/reject
│   ├── deliver-to-client/← GET/POST + [code]/received
│   ├── invoice-payment/  ← GET + [code]/mark-paid
│   ├── upload/           ← POST (file upload — nama route.ts BUKAN routes.ts)
│   ├── companies/        ← GET/POST + logo/ (GET/POST)
│   ├── customers/        ← GET/POST
│   ├── suppliers/        ← GET/POST
│   ├── products/         ← GET/POST
│   └── bank-accounts/    ← GET/POST
├── dashboard/page.tsx
├── salesorder/page.tsx
├── purchaseorder/page.tsx
└── ... (semua halaman lain)

components/
├── Sidebar.tsx           ← Nav sidebar dengan collapse groups
└── Topbar.tsx            ← Header dengan breadcrumb + search

hooks/
└── useApi.ts             ← useApi() + usePaginated() hooks

lib/
└── utils.ts              ← formatRupiah, formatDate, status maps (SATU file, semua import dari sini)

app/lib/
├── db.ts                 ← MySQL pool (fixed: no number-to-string bug)
├── auth.ts               ← JWT + httpOnly cookie (fixed: bukan localStorage)
└── response.ts           ← Standardized API responses
```

---

## Fixes dari v1

| Issue | v1 | v2 |
|-------|----|----|
| Token storage | `localStorage` (XSS risk) | `httpOnly cookie` |
| Upload endpoint | `routes.js` (404) | `route.ts` ✓ |
| Sidebar links | `/bank-rekonsile`, `/manual-journal` (broken) | `/bank-reconciliations`, `/manual-journals` |
| Companies logo | API tidak ada (404) | `/api/companies/logo` exists |
| PO dropdown | HTTP `OPTIONS` method (non-standard) | `GET ?action=dropdowns` |
| Number formatting | 3 pattern berbeda | `formatRupiah()` dari `lib/utils.ts` |
| Dashboard data | Hardcoded 0 | Query real |
| Build errors | `ignoreBuildErrors: true` | TypeScript errors block build |
| Turbopack | `--turbopack` di build | Removed (stable webpack) |
| Next.js version | 16.2.6 (tidak ada) | 15.3.2 (latest stable) |
| `.env` di Git | Ter-commit | `.gitignore` covers it |
| Number-to-string | `db.js` convert number → string | Fixed di `db.ts` |

---

## API Conventions

- Semua response: `{ success: true, data: ... }` atau `{ success: false, error: '...' }`
- Paginated: `{ success: true, data: [], meta: { total, page, limit, totalPages } }`
- Auth: semua route pakai `withAuth()` wrapper
- Status enums ada di `lib/utils.ts` — update di satu tempat

---

## Status Enums (DB ↔ UI)

### Sales Order
`submitted → processing → ready_to_invoice → shipped → delivered → completed | cancelled`

### Purchase Order  
`submitted → approved_spv → approved_finance → paid | rejected`

### Cash Advance
`submitted → approved → active → partially_used / fully_used → completed | in_settlement | rejected`

### Reimbursement
`submitted → approved | rejected`

### Delivery Order
`not_created → created → shipped → delivered`
