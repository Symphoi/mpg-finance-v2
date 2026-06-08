'use client';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface Meta {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

interface PaginationProps {
  meta:      Meta;
  setPage:   (page: number) => void;
  setLimit?: (limit: number) => void;
  limitOptions?: number[];
}

function buildPages(page: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | '...')[] = [1];
  if (page > 3)               pages.push('...');
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
  if (page < totalPages - 2)  pages.push('...');
  pages.push(totalPages);
  return pages;
}

export default function Pagination({ meta, setPage, setLimit, limitOptions = [10, 20, 30, 50] }: PaginationProps) {
  if (meta.totalPages <= 1 && meta.total <= (limitOptions[0] ?? 10)) return null;

  const from  = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to    = Math.min(meta.page * meta.limit, meta.total);
  const pages = buildPages(meta.page, meta.totalPages);

  return (
    <div
      className="flex items-center justify-between flex-wrap gap-2 no-print"
      style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border-soft)' }}
    >
      {/* Left: count + per-page */}
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {meta.total > 0 ? `${from}–${to} dari ${meta.total}` : '0 data'}
        </span>

        {setLimit && (
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Tampil</span>
            <div style={{ position: 'relative' }}>
              <select
                className="appearance-none pl-2 pr-6 py-1 rounded-md"
                style={{
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontFamily: 'inherit',
                }}
                value={meta.limit}
                onChange={e => setLimit(Number(e.target.value))}
              >
                {limitOptions.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown size={11} style={{
                position: 'absolute', right: 6, top: '50%',
                transform: 'translateY(-50%)', pointerEvents: 'none',
                color: 'var(--color-text-muted)',
              }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>per halaman</span>
          </div>
        )}
      </div>

      {/* Right: page buttons */}
      <div className="pagination">
        <button
          className="page-btn"
          disabled={meta.page <= 1}
          onClick={() => setPage(meta.page - 1)}
        >
          <ChevronLeft size={13} />
        </button>

        {pages.map((p, i) =>
          p === '...'
            ? <span key={`e${i}`} className="page-btn" style={{ cursor: 'default', color: 'var(--color-text-muted)' }}>…</span>
            : <button
                key={p}
                className={`page-btn ${p === meta.page ? 'active' : ''}`}
                onClick={() => setPage(p as number)}
              >
                {p}
              </button>
        )}

        <button
          className="page-btn"
          disabled={meta.page >= meta.totalPages}
          onClick={() => setPage(meta.page + 1)}
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
