# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js 15 with Turbopack)
npm run build        # Production build — TypeScript and ESLint errors block it (intentional)
npm run lint         # ESLint
npm run test         # Run all tests (Vitest, node environment)
npm run test:watch   # Watch mode
npm run test:coverage  # Coverage report (html + text)
```

Run a single test file:
```bash
npx vitest run tests/sales-orders-api.test.ts
```

## Architecture

**MPG Finance v2** is a Finance ERP built with Next.js 15 App Router + MySQL 8.

### Routing Layout
- `app/(app)/` — all protected pages under the shell layout (`layout.tsx` wraps with Sidebar + Topbar)
- `app/api/` — all API routes; every handler must be wrapped with `withAuth()`
- `app/login/` — public, no auth required
- `middleware.ts` — edge auth check: only checks cookie existence, full verification happens inside `withAuth()`

### Core Libraries (`app/lib/`)
- `db.ts` — MySQL pool with `query<T>()`, `queryOne<T>()`, and `transaction()`. All number params auto-converted to strings to avoid mysql2 LIMIT/OFFSET bug — do not pass raw numbers as SQL params.
- `auth.ts` — JWT in `httpOnly` cookie (`mpg_token`). JWT payload carries `roles: string[]` and `permissions: string[]` as code strings (e.g. `'ADMIN'`, `'SALES_ORDER_CREATE'`). Use `withAuth()`, `hasPermission()`, `hasRole()`.
- `response.ts` — standardized response helpers: `ok()`, `created()`, `paginated()`, `badRequest()`, `unauthorized()`, `forbidden()`, `notFound()`, `serverError()`. Always use these — never return raw `NextResponse.json`.

### Shared Utilities (`lib/utils.ts`)
Single source of truth for formatting and status maps. Never inline format currency, dates, or status labels:
- `formatRupiah()` / `formatRupiahCompact()` — Indonesian Rupiah
- `formatDate()` / `formatDateTime()` / `formatRelativeTime()` — Indonesian locale
- `exportExcel()` — SheetJS, dynamically imported
- Status maps: `SO_STATUS`, `PO_STATUS`, `CA_STATUS`, `REIMBURSE_STATUS`, `DO_STATUS`

### Client Hooks (`hooks/useApi.ts`)
- `useApi<T>(url)` — single fetch with loading/error state
- `usePaginated<T>(baseUrl, initialParams)` — paginated fetch with `setSearch`, `setStatus`, `setPage`, `setLimit`, `setParam`
- `useDebounce<T>(value, delay)` — debounce for search inputs

### Accounting Engine (`lib/accounting.ts`)
Central module for all double-entry bookkeeping. Handles journal entries, AR, AP, payment, intercompany transfers, and financial reports. Journal entries are driven by `accounting_rules` in the database (transaction type → debit/credit account). Chart of accounts and transaction types are cached for 5 minutes.

## API Conventions

- **Auth**: all routes → `export const GET = withAuth(async (req, user) => { ... })`
- **Dropdowns for forms**: use `GET ?action=dropdowns` — not HTTP OPTIONS
- **Pagination**: always return `paginated(data, total, page, limit)` with `meta`
- **Intercompany**: when bank account belongs to a different company than the source transaction, create two separate journal entries

## Business Flows

| Flow | Trigger | Side Effects |
|------|---------|-------------|
| DO delivered | `POST /api/deliver-to-client/[do_code]/delivered` | Creates AR + COGS journal; if all SO items shipped → SO → `invoicing` |
| PO approved finance | `POST /api/approval-transactions` | Creates AP + journal; PO → `approved` |
| Invoice payment | `POST /api/invoice-payment/pay` | Updates AR `unpaid→partial→paid`; if all AR paid → SO → `completed`; intercompany detection |

## Status Enums

All status values come from `lib/utils.ts`. Do not hardcode labels or colors:

| Module | Flow |
|--------|------|
| SO | `submitted → processing → invoicing → completed` |
| PO | `submitted → approved_spv → approved → paid` |
| DO | `shipping → delivered` (or `cancelled`) |
| AR/AP | `unpaid → partial → paid` |
| CA | `submitted → approved → active → partially_used/fully_used → in_settlement → completed` |
| Reimburse | `submitted → approved/rejected` |

## Testing

Tests live in `tests/`. The setup (`tests/setup.ts`) mocks `next/server` (NextRequest/NextResponse) and `mysql2`. Tests use Vitest globals (`describe`, `it`, `expect`, `vi`). Coverage targets `lib/**` and `app/api/**`.

When adding a new API route, add a corresponding test file under `tests/`.

## Environment Variables

Required in `.env` (not committed):
```
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
JWT_SECRET, JWT_EXPIRES_IN
```
