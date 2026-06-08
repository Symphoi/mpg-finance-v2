'use client';
import { useState, useCallback } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate } from '@/lib/utils';
import { ChevronDown, ChevronRight as ChevRight, Bot, User, Search } from 'lucide-react';
import Pagination from '@/components/Pagination';

interface JournalRow {
  journal_code:    string;
  transaction_date: string;
  description:     string;
  source:          'SYSTEM' | 'MANUAL';
  ref_type:        string;
  ref_type_label:  string;
  ref_code:        string;
  company_code:    string;
  total_debit:     number;
  total_credit:    number;
  status:          string;
  created_by_name: string;
  created_by_code: string;
}

const SOURCE_STYLE = {
  SYSTEM: { bg: '#EEF2FF', color: '#4F46E5', border: '#C7D2FE', label: 'System' },
  MANUAL: { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE', label: 'Manual' },
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  posted:    { bg: '#ECFDF5', color: '#059669' },
  draft:     { bg: '#F9FAFB', color: '#6B7280' },
  cancelled: { bg: '#FEF2F2', color: '#DC2626' },
};

export default function JournalsPage() {
  const [search,  setSearch]  = useState('');
  const [source,  setSource]  = useState('');
  const [from,    setFrom]    = useState('');
  const [to,      setTo]      = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, meta, loading, setPage, setParam, refetch } = usePaginated<JournalRow>(
    '/api/journals',
    { limit: '25' },
  );

  const applyFilters = useCallback(() => {
    setParam('search', search);
    setParam('source', source);
    setParam('from',   from);
    setParam('to',     to);
  }, [search, source, from, to, setParam]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setSource('');
    setFrom('');
    setTo('');
    setParam('search', '');
    setParam('source', '');
    setParam('from',   '');
    setParam('to',     '');
  }, [setParam]);

  const toggleExpand = (code: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  return (
    <div className="space-y-4 max-w-[1300px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: 'var(--color-text)' }}>Log Jurnal</h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Semua jurnal — manual maupun otomatis dari sistem
          </p>
        </div>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {meta.total} entri
        </span>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            className="input text-[12px] py-1.5"
            style={{ paddingLeft: 30 }}
            placeholder="Cari kode / deskripsi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
          />
        </div>

        <select value={source} onChange={e => setSource(e.target.value)} className="input text-[12px] py-1.5" style={{ width: 150 }}>
          <option value="">Semua Sumber</option>
          <option value="MANUAL">Manual (user)</option>
          <option value="SYSTEM">Otomatis (system)</option>
        </select>

        <div style={{ width: 1, height: 22, background: 'var(--color-border)', flexShrink: 0 }} />

        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input text-[12px] py-1.5" style={{ width: 140 }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>–</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input text-[12px] py-1.5" style={{ width: 140 }} />

        <button className="btn btn-primary btn-sm" onClick={applyFilters}>Cari</button>
        <button className="btn btn-outline btn-sm" onClick={resetFilters}>Reset</button>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 32 }} />
                <th>Tanggal</th>
                <th>Kode Jurnal</th>
                <th>Deskripsi</th>
                <th>Tipe</th>
                <th>Sumber</th>
                <th>Dibuat Oleh</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                    Memuat...
                  </td>
                </tr>
              )}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                    Tidak ada data jurnal
                  </td>
                </tr>
              )}
              {!loading && data.map(row => {
                const srcStyle = SOURCE_STYLE[row.source] ?? SOURCE_STYLE.SYSTEM;
                const stStyle  = STATUS_STYLE[row.status] ?? STATUS_STYLE.draft;
                const isOpen   = expanded.has(row.journal_code);

                return (
                  <>
                    <tr key={row.journal_code}
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleExpand(row.journal_code)}
                    >
                      {/* expand toggle */}
                      <td style={{ padding: '10px 8px 10px 14px' }}>
                        <span style={{ color: 'var(--color-text-muted)', display: 'flex' }}>
                          {isOpen
                            ? <ChevronDown size={14} />
                            : <ChevRight size={14} />
                          }
                        </span>
                      </td>

                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                        {formatDate(row.transaction_date)}
                      </td>

                      <td>
                        <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 11.5, color: 'var(--color-primary)' }}>
                          {row.journal_code}
                        </span>
                        {row.ref_code && (
                          <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)', marginTop: 1 }}>
                            ref: {row.ref_code}
                          </div>
                        )}
                      </td>

                      <td style={{ maxWidth: 280 }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text)' }}>
                          {row.description || '—'}
                        </span>
                        {row.company_code && (
                          <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                            · {row.company_code}
                          </span>
                        )}
                      </td>

                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px', borderRadius: 20,
                          fontSize: 10.5, fontWeight: 600,
                          background: '#F0FDF4', color: '#059669',
                          border: '1px solid #A7F3D0',
                        }}>
                          {row.ref_type_label}
                        </span>
                      </td>

                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 20,
                          fontSize: 10.5, fontWeight: 600,
                          background: srcStyle.bg, color: srcStyle.color,
                          border: `1px solid ${srcStyle.border}`,
                        }}>
                          {row.source === 'SYSTEM'
                            ? <Bot size={10} />
                            : <User size={10} />
                          }
                          {srcStyle.label}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>
                          {row.created_by_name}
                        </div>
                        {row.created_by_code && row.created_by_code !== row.created_by_name && (
                          <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                            {row.created_by_code}
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span className="tbl-mono">{formatRupiah(row.total_debit)}</span>
                      </td>

                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px', borderRadius: 20,
                          fontSize: 10.5, fontWeight: 600,
                          background: stStyle.bg, color: stStyle.color,
                        }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded: journal items */}
                    {isOpen && (
                      <tr key={`${row.journal_code}-detail`}>
                        <td colSpan={9} style={{ padding: 0, background: '#FAFAFF' }}>
                          <JournalItems journalCode={row.journal_code} source={row.source} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination meta={meta} setPage={setPage} />
      </div>
    </div>
  );
}

// ─── Journal Items sub-component ────────────────────────────────────────────

function JournalItems({ journalCode, source }: { journalCode: string; source: 'SYSTEM' | 'MANUAL' }) {
  const [items, setItems]   = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (items !== null) return;
    setLoading(true);
    try {
      const endpoint = source === 'MANUAL'
        ? `/api/manual-journals?search=${journalCode}&limit=1`
        : `/api/reports/general-ledger?journal_code=${journalCode}`;

      // Use journal_items directly
      const res = await fetch(`/api/journals/${journalCode}/items`, { credentials: 'include' });
      if (res.ok) {
        const j = await res.json();
        setItems(j.data ?? []);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [journalCode, source, items]);

  // Auto-load when rendered
  if (items === null && !loading) { load(); }

  return (
    <div style={{ padding: '0 48px 12px' }}>
      {loading && (
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 0' }}>Memuat rincian...</p>
      )}
      {items && items.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 0' }}>Tidak ada rincian item.</p>
      )}
      {items && items.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10.5, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Akun</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10.5, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Keterangan</th>
              <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 10.5, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Debit</th>
              <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 10.5, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kredit</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                <td style={{ padding: '6px 10px' }}>
                  <span style={{ fontFamily: "'Fira Code', monospace", color: 'var(--color-primary)', fontSize: 11.5 }}>{item.account_code}</span>
                  {item.account_name && (
                    <span style={{ marginLeft: 6, color: 'var(--color-text-secondary)' }}>{item.account_name}</span>
                  )}
                </td>
                <td style={{ padding: '6px 10px', color: 'var(--color-text-secondary)' }}>{item.description || '—'}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: "'Fira Code', monospace", color: Number(item.debit_amount) > 0 ? '#059669' : 'var(--color-text-muted)' }}>
                  {Number(item.debit_amount) > 0 ? formatRupiah(item.debit_amount) : '—'}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: "'Fira Code', monospace", color: Number(item.credit_amount) > 0 ? '#DC2626' : 'var(--color-text-muted)' }}>
                  {Number(item.credit_amount) > 0 ? formatRupiah(item.credit_amount) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
