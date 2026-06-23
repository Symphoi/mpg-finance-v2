'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { formatRupiah, formatDate, exportExcel } from '@/lib/utils';
import { Download, Plus, Send, Trash2, RefreshCw, FileUp, FileDown, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useApi';

// ── Types ─────────────────────────────────────────────────────────────────────
interface COA { account_code: string; account_name: string; account_type: string; }

interface Entry {
  id?: number;
  entry_code?: string;
  entry_type: 'AR' | 'AP' | 'Bank';
  source_type?: 'manual' | 'system';
  source_ref?: string;
  entry_date: string;
  description?: string;
  reference?: string;
  amount: number;
  dr_account_code?: string;
  cr_account_code?: string;
  dr_account_name?: string;
  cr_account_name?: string;
  status: 'draft' | 'posted';
  journal_code?: string;
  meta?: Record<string, any>;
  // local only (unsaved new row)
  _isNew?: boolean;
  _localId?: number;
}

type TabType = 'AR' | 'AP' | 'Bank';

// ── Helpers ───────────────────────────────────────────────────────────────────
let _localIdCounter = 0;
const newLocalId = () => ++_localIdCounter;

const today = () => new Date().toISOString().split('T')[0];

function emptyEntry(type: TabType): Entry {
  return {
    entry_type: type, status: 'draft', entry_date: today(), amount: 0,
    _isNew: true, _localId: newLocalId(),
  };
}

// ── COA Combobox (searchable) ─────────────────────────────────────────────────
function COASelect({ value, onChange, coas, disabled }: {
  value: string; onChange: (v: string) => void; coas: COA[]; disabled?: boolean;
}) {
  const [query, setQuery]       = useState('');
  const [open, setOpen]         = useState(false);
  const debouncedQ              = useDebounce(query, 150);
  const wrapRef                 = useRef<HTMLDivElement>(null);

  // display label for selected value
  const selected = coas.find(c => c.account_code === value);
  const displayLabel = selected ? `${selected.account_code} — ${selected.account_name}` : '';

  // filter list
  const filtered = debouncedQ.trim()
    ? coas.filter(c =>
        c.account_code.toLowerCase().includes(debouncedQ.toLowerCase()) ||
        c.account_name.toLowerCase().includes(debouncedQ.toLowerCase())
      ).slice(0, 40)
    : coas.slice(0, 40);

  // close on outside click
  useEffect(() => {
    const handler = (ev: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery('');
  };

  const clear = () => { onChange(''); setQuery(''); };

  if (disabled) {
    return (
      <div style={{ fontSize: 11, minWidth: 160, color: 'var(--color-text-muted)', padding: '4px 6px' }}>
        {displayLabel || '—'}
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', minWidth: 160 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <input
          className="input"
          style={{ fontSize: 11, flex: 1 }}
          placeholder={displayLabel || '— Cari akun —'}
          value={open ? query : displayLabel}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
        />
        {value && (
          <button type="button" onClick={clear}
            style={{ fontSize: 10, color: 'var(--color-text-muted)', padding: '0 2px', lineHeight: 1 }}>
            ×
          </button>
        )}
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 1000,
          background: '#fff', border: '1px solid var(--color-border)',
          borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          maxHeight: 220, overflowY: 'auto', minWidth: 260,
        }}>
          {filtered.length === 0 && (
            <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--color-text-muted)' }}>
              Tidak ditemukan
            </div>
          )}
          {filtered.map(c => (
            <div key={c.account_code}
              onMouseDown={() => pick(c.account_code)}
              style={{
                padding: '6px 10px', fontSize: 11, cursor: 'pointer',
                background: c.account_code === value ? 'var(--color-primary-light, #ede9fe)' : undefined,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.background = c.account_code === value ? 'var(--color-primary-light, #ede9fe)' : '')}
            >
              <span style={{ fontFamily: 'monospace', color: '#7c3aed' }}>{c.account_code}</span>
              {' — '}{c.account_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Template & Export config per tab ─────────────────────────────────────────
const TAB_CONFIG = {
  AR: {
    headers: ['No SO','Customer','No NPWP','Item','PO No.','Tgl Invoice','No Invoice',
              'NILAI KONTRAK','DPP','DPP LAINNYA','PPN Bendaharawan','PPN',
              'PPh 23','PPh 22','PIUTANG','No Faktur','Dr Akun','Cr Akun'],
    sample:  ['SO-2026-001','Nama Customer','0012345678','Nama Barang','PO-001',
              '2026-01-15','INV/001/2026',
              21675000,19527027,17899775,2147973,0,0,292905,19234122,'020025003','',''],
    toRow: (e: Entry) => {
      const m = e.meta ?? {};
      return [
        m.so_code ?? '', m.customer_name ?? '', m.npwp ?? '', m.item ?? '', m.po_no ?? '',
        e.entry_date, m.invoice_no ?? e.reference ?? '',
        m.nilai_kontrak ?? '', m.dpp ?? '', m.dpp_lainnya ?? '',
        m.ppn_bendaharawan ?? '', m.ppn ?? '',
        m.pph_23 ?? '', m.pph_22 ?? '', m.piutang ?? e.amount,
        m.no_faktur ?? '',
        e.dr_account_code ?? '', e.cr_account_code ?? '',
      ];
    },
  },
  AP: {
    headers: ['Code','Supplier','Item','Tgl','Sales Order','PO No.','No Invoice',
              'Amount','VAT','PPH 23','A/P','Status PO','Dr Akun','Cr Akun'],
    sample:  ['','Nama Supplier','Nama Barang','2026-01-15','SO-2026-001',
              'PO-001','INV/001/2026',5000000,550000,75000,5475000,'Approved','',''],
    toRow: (e: Entry) => {
      const m = e.meta ?? {};
      return [
        m.code ?? '', m.supplier_name ?? '', m.item ?? '',
        e.entry_date, m.so_code ?? '', m.po_no ?? '',
        m.invoice_no ?? e.reference ?? '',
        e.amount, m.vat ?? '', m.pph_23 ?? '', m.ap_amount ?? e.amount,
        m.ap_status ?? '',
        e.dr_account_code ?? '', e.cr_account_code ?? '',
      ];
    },
  },
  Bank: {
    headers: ['Tanggal','Vouc. No','Project','AC No.','Description',
              'Transaction','Ref.','Masuk','Keluar','Dr Akun','Cr Akun'],
    sample:  ['2026-01-07','V-001','ALKES','71040-00',
              'BI-FAST DB TRANSFER KE AGUS','Teknisi Cibinong','','','2500000','',''],
    toRow: (e: Entry) => {
      const m = e.meta ?? {};
      return [
        e.entry_date, e.reference ?? '', m.project ?? '', m.ac_lawan ?? '',
        e.description ?? '', m.transaction_category ?? '', m.ref ?? '',
        m.amount_in || '', m.amount_out || '',
        e.dr_account_code ?? '', e.cr_account_code ?? '',
      ];
    },
  },
} as const;

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AccountingEntryPage() {
  const [tab, setTab]           = useState<TabType>('AR');
  const [coas, setCoas]         = useState<COA[]>([]);
  const [entries, setEntries]   = useState<Entry[]>([]);
  const [loading, setLoading]   = useState(false);
  const [pulling, setPulling]   = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [posting, setPosting]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<number | string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [month, setMonth]       = useState(new Date().toISOString().slice(0, 7));

  // Load COA once
  useEffect(() => {
    fetch('/api/accounting-entries?action=accounts', { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setCoas(j.data ?? []); });
  }, []);

  // Load entries when tab or month changes
  const loadEntries = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const r = await fetch(
        `/api/accounting-entries?type=${tab}&month=${month}&limit=200`,
        { credentials: 'include' }
      );
      const j = await r.json();
      if (j.success) setEntries(j.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [tab, month]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // ── Tarik dari Sistem ────────────────────────────────────────────────────
  const pullFromSystem = async () => {
    setPulling(true);
    try {
      const r = await fetch(`/api/accounting-entries?action=pull&type=${tab}`, { credentials: 'include' });
      const j = await r.json();
      if (!j.success) { toast.error(j.error); return; }

      const pulled: any[] = j.data ?? [];
      if (!pulled.length) { toast.info('Tidak ada data baru dari sistem'); return; }

      // Build entries from pulled data
      const toCreate: Entry[] = pulled.map(row => {
        if (tab === 'AR') {
          return {
            entry_type: 'AR', status: 'draft',
            entry_date: row.invoice_date?.split('T')[0] ?? today(),
            description: `AR — ${row.customer_name ?? ''} — ${row.invoice_number ?? ''}`,
            reference: row.invoice_number,
            amount: Number(row.outstanding_amount) || Number(row.amount) || 0,
            source_type: 'system',
            source_ref: row.ar_code,
            meta: {
              so_code: row.so_code ?? '',
              customer_name: row.customer_name ?? '',
              npwp: row.npwp ?? '',
              item: row.items ?? '',
              po_no: row.po_code ?? '',
              invoice_no: row.invoice_number ?? '',
              // nilai_kontrak = total SO (DPP + PPN). If no SO linked, fallback to DPP.
              nilai_kontrak: Number(row.nilai_kontrak) || Number(row.amount) || 0,
              dpp: Number(row.amount) || 0,
              dpp_lainnya: 0,
              ppn_bendaharawan: 0,
              // PPN = nilai_kontrak − DPP. ar.tax_amount is never set by the system.
              ppn: Math.max(0, (Number(row.nilai_kontrak) || 0) - (Number(row.amount) || 0)),
              pph_23: 0,
              pph_22: 0,
              piutang: Number(row.outstanding_amount) || 0,
              no_faktur: '',
            },
          } as Entry;
        }
        // AP
        const apTotal = Number(row.total_amount) || 0;
        const apVat   = Number(row.tax_amount)   || 0;
        const apDpp   = apTotal - apVat;  // DPP = total excluding VAT
        return {
          entry_type: 'AP', status: 'draft',
          entry_date: row.created_at?.split('T')[0] ?? today(),
          description: `AP — ${row.supplier_name ?? ''} — ${row.items ?? ''}`,
          reference: row.po_code,
          amount: apDpp,  // amount = DPP (pre-tax base)
          source_type: 'system',
          source_ref: row.po_code,
          meta: {
            supplier_name: row.supplier_name ?? '',
            item: row.items ?? '',
            so_code: row.so_code ?? '',
            po_no: row.po_code ?? '',
            invoice_no: '',
            vat: apVat,
            pph_23: 0,
            ap_amount: apTotal,  // total hutang = DPP + VAT
            ap_status: row.status ?? '',
          },
        } as Entry;
      });

      // Save to server
      const res = await fetch('/api/accounting-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: tab, entries: toCreate }),
      });
      const rj = await res.json();
      if (!rj.success) { toast.error(rj.error); return; }

      toast.success(`${rj.data.count} data ditarik dari sistem`);
      loadEntries();
    } finally {
      setPulling(false);
    }
  };

  // ── Sync Meta — refresh meta for existing draft entries ─────────────────
  const syncMeta = async () => {
    if (!['AR', 'AP'].includes(tab)) { toast.info('Sync Meta hanya tersedia untuk tab AR dan AP'); return; }
    setSyncing(true);
    try {
      const res = await fetch('/api/accounting-entries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: tab }),
      });
      const j = await res.json();
      if (!j.success) { toast.error(j.error); return; }
      toast.success(`Meta diperbarui: ${j.data.updated} entri`);
      loadEntries();
    } finally {
      setSyncing(false);
    }
  };

  // ── Tambah Baris ─────────────────────────────────────────────────────────
  const addRow = () => {
    setEntries(prev => [emptyEntry(tab), ...prev]);
  };

  // ── Save new row ──────────────────────────────────────────────────────────
  const saveNewRow = async (e: Entry) => {
    if (!e.entry_date) { toast.error('Tanggal wajib diisi'); return; }
    const res = await fetch('/api/accounting-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type: tab, entries: [e] }),
    });
    const j = await res.json();
    if (!j.success) { toast.error(j.error); return; }
    toast.success('Baris disimpan');
    loadEntries();
  };

  // ── Inline update Dr/Cr ───────────────────────────────────────────────────
  const updateAccount = async (entry: Entry, field: 'dr_account_code' | 'cr_account_code', val: string) => {
    if (entry._isNew) {
      setEntries(prev => prev.map(e =>
        e._localId === entry._localId ? { ...e, [field]: val } : e
      ));
      return;
    }
    // Optimistic update
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, [field]: val } : e));
    const patch: any = { id: entry.id, dr_account_code: entry.dr_account_code, cr_account_code: entry.cr_account_code };
    patch[field] = val;
    const res = await fetch('/api/accounting-entries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    const j = await res.json();
    if (!j.success) toast.error(j.error);
  };

  // ── Delete row ────────────────────────────────────────────────────────────
  const deleteRow = async (entry: Entry) => {
    if (entry._isNew) {
      setEntries(prev => prev.filter(e => e._localId !== entry._localId));
      return;
    }
    const res = await fetch(`/api/accounting-entries?id=${entry.id}`, {
      method: 'DELETE', credentials: 'include',
    });
    const j = await res.json();
    if (!j.success) { toast.error(j.error); return; }
    toast.success('Baris dihapus');
    setEntries(prev => prev.filter(e => e.id !== entry.id));
    setSelected(prev => { const s = new Set(prev); s.delete(entry.id!); return s; });
  };

  // ── Select ────────────────────────────────────────────────────────────────
  const toggleSelect = (key: number | string) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  };

  const draftEntries  = entries.filter(e => !e._isNew && e.status === 'draft');
  const selectableKeys = draftEntries.map(e => e.id!);
  const allSelected   = selectableKeys.length > 0 && selectableKeys.every(k => selected.has(k));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(selectableKeys));
  };

  // ── Download Template ─────────────────────────────────────────────────────
  const downloadTemplate = async () => {
    const cfg = TAB_CONFIG[tab];
    const rows: (string | number)[][] = [
      [...cfg.headers],
      [...cfg.sample] as (string | number)[],
    ];
    await exportExcel(rows, `Template_${tab}_AccountingEntry`, tab);
    toast.success('Template didownload');
  };

  // ── Export Data ───────────────────────────────────────────────────────────
  const exportData = async () => {
    setExporting(true);
    try {
      const r = await fetch(
        `/api/accounting-entries?type=${tab}&month=${month}&limit=1000`,
        { credentials: 'include' }
      );
      const j = await r.json();
      if (!j.success) { toast.error(j.error); return; }

      const cfg  = TAB_CONFIG[tab];
      const data  = j.data as Entry[];
      const rows: (string | number)[][] = [
        [...cfg.headers],
        ...data.map(e => cfg.toRow(e) as (string | number)[]),
      ];

      await exportExcel(rows, `AccountingEntry_${tab}_${month}`, tab);
      toast.success(`${data.length} baris diekspor`);
    } finally {
      setExporting(false);
    }
  };

  // ── Import Excel ──────────────────────────────────────────────────────────
  const importExcel = async (file: File) => {
    setImporting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', tab);
      const res = await fetch('/api/accounting-entries/import', {
        method: 'POST', credentials: 'include', body: form,
      });
      const j = await res.json();
      if (!j.success) { toast.error(j.error); return; }
      toast.success(`${j.data.imported} baris berhasil diimport dari Excel`);
      loadEntries();
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Post Journal ──────────────────────────────────────────────────────────
  const postJournal = async () => {
    const ids = [...selected].filter(k => typeof k === 'number') as number[];
    if (!ids.length) { toast.error('Pilih minimal 1 entry untuk diposting'); return; }

    setPosting(true);
    try {
      const res = await fetch('/api/accounting-entries/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids }),
      });
      const j = await res.json();
      if (!j.success) { toast.error(j.error); return; }
      toast.success(`${j.data.posted} journal berhasil diposting`);
      setSelected(new Set());
      loadEntries();
    } finally {
      setPosting(false);
    }
  };

  // ── Inline field update for new rows ─────────────────────────────────────
  const updateNewRow = (localId: number, field: string, val: string) => {
    setEntries(prev => prev.map(e =>
      e._localId === localId
        ? field.startsWith('meta.')
          ? { ...e, meta: { ...(e.meta ?? {}), [field.slice(5)]: val } }
          : { ...e, [field]: val }
        : e
    ));
  };

  const selectedCount = selected.size;

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Accounting Entry</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Input jurnal AR / AP / Bank — assign akun Debit & Kredit per transaksi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            className="input"
            style={{ fontSize: 12, height: 32 }}
            value={month}
            onChange={e => setMonth(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {(['AR', 'AP', 'Bank'] as TabType[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-[13px] font-semibold border-b-2 transition-colors"
            style={{
              borderColor: tab === t ? 'var(--color-primary)' : 'transparent',
              color: tab === t ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}
          >
            {t === 'AR' ? 'AR (Piutang)' : t === 'AP' ? 'AP (Hutang)' : 'Bank'}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {tab !== 'Bank' && (
          <>
            <button className="btn btn-outline btn-sm" onClick={pullFromSystem} disabled={pulling}>
              <Download size={13} /> {pulling ? 'Menarik...' : 'Tarik dari Sistem'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={syncMeta} disabled={syncing}
              title="Refresh NPWP, Item, PO No, Nilai Kontrak, PPN dari data terkini">
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Sync...' : 'Sync Meta'}
            </button>
          </>
        )}
        <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
          <FileUp size={13} /> {importing ? 'Mengimport...' : 'Import Excel'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) importExcel(f); }}
        />
        <button className="btn btn-outline btn-sm" onClick={addRow}>
          <Plus size={13} /> Tambah Baris
        </button>
        <button className="btn btn-outline btn-sm" onClick={loadEntries} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
        <div className="flex-1" />
        <button className="btn btn-outline btn-sm" onClick={downloadTemplate} title="Download template Excel kosong">
          <FileText size={13} /> Template
        </button>
        <button className="btn btn-outline btn-sm" onClick={exportData} disabled={exporting} title="Export data saat ini ke Excel">
          <FileDown size={13} /> {exporting ? 'Mengexport...' : 'Export'}
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={postJournal}
          disabled={posting || selectedCount === 0}
        >
          <Send size={13} />
          {posting ? 'Posting...' : `Post Journal${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
        </button>
      </div>

      {/* Grid */}
      <div className="card overflow-hidden">
        <div className="tbl-wrapper" style={{ overflowX: 'auto' }}>
          {tab === 'AR' && (
            <ARGrid
              entries={entries}
              coas={coas}
              loading={loading}
              selected={selected}
              allSelected={allSelected}
              toggleAll={toggleAll}
              toggleSelect={toggleSelect}
              updateAccount={updateAccount}
              updateNewRow={updateNewRow}
              saveNewRow={saveNewRow}
              deleteRow={deleteRow}
            />
          )}
          {tab === 'AP' && (
            <APGrid
              entries={entries}
              coas={coas}
              loading={loading}
              selected={selected}
              allSelected={allSelected}
              toggleAll={toggleAll}
              toggleSelect={toggleSelect}
              updateAccount={updateAccount}
              updateNewRow={updateNewRow}
              saveNewRow={saveNewRow}
              deleteRow={deleteRow}
            />
          )}
          {tab === 'Bank' && (
            <BankGrid
              entries={entries}
              coas={coas}
              loading={loading}
              selected={selected}
              allSelected={allSelected}
              toggleAll={toggleAll}
              toggleSelect={toggleSelect}
              updateAccount={updateAccount}
              updateNewRow={updateNewRow}
              saveNewRow={saveNewRow}
              deleteRow={deleteRow}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared grid props ─────────────────────────────────────────────────────────
interface GridProps {
  entries: Entry[];
  coas: COA[];
  loading: boolean;
  selected: Set<number | string>;
  allSelected: boolean;
  toggleAll: () => void;
  toggleSelect: (k: number | string) => void;
  updateAccount: (e: Entry, f: 'dr_account_code' | 'cr_account_code', v: string) => void;
  updateNewRow: (localId: number, field: string, val: string) => void;
  saveNewRow: (e: Entry) => void;
  deleteRow: (e: Entry) => void;
}

const thStyle: React.CSSProperties = {
  padding: '8px 10px', fontSize: 11, fontWeight: 600,
  color: 'var(--color-text-muted)', whiteSpace: 'nowrap',
  background: 'var(--color-surface-muted)',
  borderBottom: '1px solid var(--color-border)',
  textAlign: 'left',
};
const tdStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: 12, verticalAlign: 'middle',
  borderBottom: '1px solid var(--color-border-soft)',
};

function StatusBadge({ status, journal_code }: { status: string; journal_code?: string }) {
  if (status === 'posted') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="badge badge-green">Posted</span>
        {journal_code && (
          <span className="font-mono" style={{ fontSize: 10, color: '#7c3aed' }}>{journal_code}</span>
        )}
      </div>
    );
  }
  return <span className="badge badge-amber">Draft</span>;
}

// ── AR Grid ───────────────────────────────────────────────────────────────────
function ARGrid({ entries, coas, loading, selected, allSelected, toggleAll, toggleSelect,
  updateAccount, updateNewRow, saveNewRow, deleteRow }: GridProps) {
  // 21 cols: ☐ + 19 data + action
  const SPAN = 21;
  return (
    <table className="tbl" style={{ minWidth: 2000 }}>
      <thead>
        <tr>
          <th style={{ ...thStyle, width: 36 }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          </th>
          {['No SO','Customer','No NPWP','Item','PO No.','Tgl Invoice','No Invoice',
            'NILAI KONTRAK','DPP','DPP LAINNYA','PPN Bendaharawan','PPN',
            'PPh 23','PPh 22','PIUTANG','No Faktur','Dr Akun','Cr Akun','Status',''].map((c, i) =>
            <th key={i} style={thStyle}>{c}</th>
          )}
        </tr>
      </thead>
      <tbody>
        {loading && (
          <tr><td colSpan={SPAN} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>
        )}
        {!loading && entries.length === 0 && (
          <tr><td colSpan={SPAN} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
            Belum ada data. Klik "Tarik dari Sistem" atau "Tambah Baris".
          </td></tr>
        )}
        {entries.map((e, i) => {
          const rowKey     = e._isNew ? `new-${e._localId}` : e.id!;
          const isPosted   = e.status === 'posted';
          const isSelected = selected.has(e.id ?? '');
          const m          = e.meta ?? {};
          const rowBg      = isPosted ? 'var(--color-surface-muted)' : i % 2 === 0 ? undefined : 'var(--color-surface-alt)';

          if (e._isNew) {
            return (
              <tr key={rowKey} style={{ background: '#fffbeb' }}>
                <td style={tdStyle} />
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 100 }}
                    placeholder="No SO" value={m.so_code ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.so_code', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 140 }}
                    placeholder="Customer" value={m.customer_name ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.customer_name', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 110 }}
                    placeholder="No NPWP" value={m.npwp ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.npwp', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 140 }}
                    placeholder="Item" value={m.item ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.item', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 90 }}
                    placeholder="PO No." value={m.po_no ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.po_no', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input type="date" className="input" style={{ fontSize: 11 }}
                    value={e.entry_date}
                    onChange={ev => updateNewRow(e._localId!, 'entry_date', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 130 }}
                    placeholder="No Invoice" value={e.reference ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'reference', ev.target.value)} />
                </td>
                {(['nilai_kontrak','dpp','dpp_lainnya','ppn_bendaharawan','ppn','pph_23','pph_22'] as const).map(f => (
                  <td key={f} style={tdStyle}>
                    <input type="number" className="input" style={{ fontSize: 11, width: 100, textAlign: 'right' }}
                      placeholder="0" value={(m as any)[f] ?? ''}
                      onChange={ev => updateNewRow(e._localId!, `meta.${f}`, ev.target.value)} />
                  </td>
                ))}
                <td style={tdStyle}>
                  <input type="number" className="input" style={{ fontSize: 11, width: 110, textAlign: 'right' }}
                    placeholder="PIUTANG" value={e.amount || ''}
                    onChange={ev => updateNewRow(e._localId!, 'amount', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 110 }}
                    placeholder="No Faktur" value={m.no_faktur ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.no_faktur', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <COASelect value={e.dr_account_code ?? ''} coas={coas}
                    onChange={v => updateNewRow(e._localId!, 'dr_account_code', v)} />
                </td>
                <td style={tdStyle}>
                  <COASelect value={e.cr_account_code ?? ''} coas={coas}
                    onChange={v => updateNewRow(e._localId!, 'cr_account_code', v)} />
                </td>
                <td style={tdStyle}><span className="badge badge-amber">Baru</span></td>
                <td style={tdStyle}>
                  <div className="flex gap-1">
                    <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }}
                      onClick={() => saveNewRow(e)}>Simpan</button>
                    <button onClick={() => deleteRow(e)}><Trash2 size={12} style={{ color: '#dc2626' }} /></button>
                  </div>
                </td>
              </tr>
            );
          }

          return (
            <tr key={rowKey} style={{ background: rowBg, opacity: isPosted ? 0.75 : 1 }}>
              <td style={tdStyle}>
                {!isPosted && <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(e.id!)} />}
              </td>
              <td style={tdStyle}><span className="tbl-mono" style={{ fontSize: 11 }}>{m.so_code ?? '-'}</span></td>
              <td style={tdStyle}><div style={{ maxWidth: 160, fontSize: 12 }}>{m.customer_name ?? '-'}</div></td>
              <td style={tdStyle}><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{m.npwp ?? '-'}</span></td>
              <td style={tdStyle}><div style={{ maxWidth: 140, fontSize: 11, color: 'var(--color-text-muted)' }}>{m.item ?? '-'}</div></td>
              <td style={tdStyle}><span className="tbl-mono" style={{ fontSize: 11 }}>{m.po_no ?? '-'}</span></td>
              <td style={tdStyle}>{e.entry_date ? formatDate(e.entry_date) : '-'}</td>
              <td style={tdStyle}><span className="tbl-mono" style={{ fontSize: 11 }}>{m.invoice_no ?? e.reference ?? '-'}</span></td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(m.nilai_kontrak) ? formatRupiah(Number(m.nilai_kontrak)) : '-'}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(m.dpp) ? formatRupiah(Number(m.dpp)) : '-'}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(m.dpp_lainnya) ? formatRupiah(Number(m.dpp_lainnya)) : '-'}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(m.ppn_bendaharawan) ? formatRupiah(Number(m.ppn_bendaharawan)) : '-'}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(m.ppn) ? formatRupiah(Number(m.ppn)) : '-'}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(m.pph_23) ? formatRupiah(Number(m.pph_23)) : '-'}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(m.pph_22) ? formatRupiah(Number(m.pph_22)) : '-'}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatRupiah(e.amount)}</td>
              <td style={tdStyle}><span className="tbl-mono" style={{ fontSize: 11 }}>{m.no_faktur ?? '-'}</span></td>
              <td style={tdStyle}>
                <COASelect value={e.dr_account_code ?? ''} coas={coas} disabled={isPosted}
                  onChange={v => updateAccount(e, 'dr_account_code', v)} />
              </td>
              <td style={tdStyle}>
                <COASelect value={e.cr_account_code ?? ''} coas={coas} disabled={isPosted}
                  onChange={v => updateAccount(e, 'cr_account_code', v)} />
              </td>
              <td style={tdStyle}><StatusBadge status={e.status} journal_code={e.journal_code} /></td>
              <td style={tdStyle}>
                {!isPosted && <button onClick={() => deleteRow(e)}><Trash2 size={12} style={{ color: '#dc2626' }} /></button>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── AP Grid ───────────────────────────────────────────────────────────────────
function APGrid({ entries, coas, loading, selected, allSelected, toggleAll, toggleSelect,
  updateAccount, updateNewRow, saveNewRow, deleteRow }: GridProps) {
  // 17 cols: ☐ + 15 data + action
  const SPAN = 17;
  return (
    <table className="tbl" style={{ minWidth: 1700 }}>
      <thead>
        <tr>
          <th style={{ ...thStyle, width: 36 }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          </th>
          {['No. AE','Supplier','Item','Tgl','Sales Order','PO No.','No Invoice',
            'DPP','VAT','PPH 23','Total A/P','Status PO','Dr Akun','Cr Akun','Status Jurnal',''].map((c, i) =>
            <th key={i} style={thStyle}>{c}</th>
          )}
        </tr>
      </thead>
      <tbody>
        {loading && (
          <tr><td colSpan={SPAN} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>
        )}
        {!loading && entries.length === 0 && (
          <tr><td colSpan={SPAN} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
            Belum ada data. Klik "Tarik dari Sistem" atau "Tambah Baris".
          </td></tr>
        )}
        {entries.map((e, i) => {
          const rowKey     = e._isNew ? `new-${e._localId}` : e.id!;
          const isPosted   = e.status === 'posted';
          const isSelected = selected.has(e.id ?? '');
          const m          = e.meta ?? {};
          const rowBg      = isPosted ? 'var(--color-surface-muted)' : i % 2 === 0 ? undefined : 'var(--color-surface-alt)';

          if (e._isNew) {
            return (
              <tr key={rowKey} style={{ background: '#fffbeb' }}>
                <td style={tdStyle} />
                <td style={{ ...tdStyle, color: 'var(--color-text-muted)', fontSize: 10 }}>
                  — auto —
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 140 }}
                    placeholder="Supplier" value={m.supplier_name ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.supplier_name', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 160 }}
                    placeholder="Item" value={m.item ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.item', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input type="date" className="input" style={{ fontSize: 11 }}
                    value={e.entry_date}
                    onChange={ev => updateNewRow(e._localId!, 'entry_date', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 110 }}
                    placeholder="Sales Order" value={m.so_code ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.so_code', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 90 }}
                    placeholder="PO No." value={m.po_no ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.po_no', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 130 }}
                    placeholder="No Invoice" value={e.reference ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'reference', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input type="number" className="input" style={{ fontSize: 11, width: 110, textAlign: 'right' }}
                    placeholder="DPP" value={e.amount || ''}
                    onChange={ev => updateNewRow(e._localId!, 'amount', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input type="number" className="input" style={{ fontSize: 11, width: 100, textAlign: 'right' }}
                    placeholder="VAT" value={m.vat ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.vat', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input type="number" className="input" style={{ fontSize: 11, width: 100, textAlign: 'right' }}
                    placeholder="PPh 23" value={m.pph_23 ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.pph_23', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input type="number" className="input" style={{ fontSize: 11, width: 110, textAlign: 'right' }}
                    placeholder="Total A/P" value={m.ap_amount ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.ap_amount', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 90 }}
                    placeholder="Status" value={m.ap_status ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.ap_status', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <COASelect value={e.dr_account_code ?? ''} coas={coas}
                    onChange={v => updateNewRow(e._localId!, 'dr_account_code', v)} />
                </td>
                <td style={tdStyle}>
                  <COASelect value={e.cr_account_code ?? ''} coas={coas}
                    onChange={v => updateNewRow(e._localId!, 'cr_account_code', v)} />
                </td>
                <td style={tdStyle}><span className="badge badge-amber">Baru</span></td>
                <td style={tdStyle}>
                  <div className="flex gap-1">
                    <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }}
                      onClick={() => saveNewRow(e)}>Simpan</button>
                    <button onClick={() => deleteRow(e)}><Trash2 size={12} style={{ color: '#dc2626' }} /></button>
                  </div>
                </td>
              </tr>
            );
          }

          return (
            <tr key={rowKey} style={{ background: rowBg, opacity: isPosted ? 0.75 : 1 }}>
              <td style={tdStyle}>
                {!isPosted && <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(e.id!)} />}
              </td>
              <td style={tdStyle}><span className="tbl-mono" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{e.entry_code ?? '-'}</span></td>
              <td style={tdStyle}><div style={{ maxWidth: 160 }}>{m.supplier_name ?? '-'}</div></td>
              <td style={tdStyle}><div style={{ maxWidth: 180, fontSize: 11, color: 'var(--color-text-muted)' }}>{m.item ?? '-'}</div></td>
              <td style={tdStyle}>{e.entry_date ? formatDate(e.entry_date) : '-'}</td>
              <td style={tdStyle}><span className="tbl-mono" style={{ fontSize: 11 }}>{m.so_code ?? '-'}</span></td>
              <td style={tdStyle}><span className="tbl-mono" style={{ fontSize: 11 }}>{m.po_no ?? '-'}</span></td>
              <td style={tdStyle}><span className="tbl-mono" style={{ fontSize: 11 }}>{m.invoice_no ?? e.reference ?? '-'}</span></td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatRupiah(e.amount)}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{m.vat ? formatRupiah(m.vat) : '-'}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{m.pph_23 ? formatRupiah(m.pph_23) : '-'}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{m.ap_amount ? formatRupiah(m.ap_amount) : '-'}</td>
              <td style={tdStyle}>
                {m.ap_status
                  ? <span className={`badge ${
                      m.ap_status === 'paid' ? 'badge-green' :
                      m.ap_status === 'approved' ? 'badge-blue' :
                      m.ap_status === 'approved_spv' ? 'badge-purple' :
                      'badge-amber'
                    }`}>{m.ap_status}</span>
                  : '-'}
              </td>
              <td style={tdStyle}>
                <COASelect value={e.dr_account_code ?? ''} coas={coas} disabled={isPosted}
                  onChange={v => updateAccount(e, 'dr_account_code', v)} />
              </td>
              <td style={tdStyle}>
                <COASelect value={e.cr_account_code ?? ''} coas={coas} disabled={isPosted}
                  onChange={v => updateAccount(e, 'cr_account_code', v)} />
              </td>
              <td style={tdStyle}><StatusBadge status={e.status} journal_code={e.journal_code} /></td>
              <td style={tdStyle}>
                {!isPosted && <button onClick={() => deleteRow(e)}><Trash2 size={12} style={{ color: '#dc2626' }} /></button>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Bank Grid ─────────────────────────────────────────────────────────────────
function BankGrid({ entries, coas, loading, selected, allSelected, toggleAll, toggleSelect,
  updateAccount, updateNewRow, saveNewRow, deleteRow }: GridProps) {
  // 14 cols: ☐ + 12 data + action
  const SPAN = 14;
  return (
    <table className="tbl" style={{ minWidth: 1600 }}>
      <thead>
        <tr>
          <th style={{ ...thStyle, width: 36 }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          </th>
          {['Tanggal','Vouc. No','Project','AC No.','Description','Transaction','Ref.',
            'Masuk','Keluar','Dr Akun','Cr Akun','Status',''].map((c, i) =>
            <th key={i} style={thStyle}>{c}</th>
          )}
        </tr>
      </thead>
      <tbody>
        {loading && (
          <tr><td colSpan={SPAN} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>
        )}
        {!loading && entries.length === 0 && (
          <tr><td colSpan={SPAN} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
            Belum ada data. Klik "Tambah Baris" atau "Import Excel".
          </td></tr>
        )}
        {entries.map((e, i) => {
          const rowKey     = e._isNew ? `new-${e._localId}` : e.id!;
          const isPosted   = e.status === 'posted';
          const isSelected = selected.has(e.id ?? '');
          const m          = e.meta ?? {};
          const rowBg      = isPosted ? 'var(--color-surface-muted)' : i % 2 === 0 ? undefined : 'var(--color-surface-alt)';
          const amountIn   = Number(m.amount_in)  || 0;
          const amountOut  = Number(m.amount_out) || 0;

          if (e._isNew) {
            return (
              <tr key={rowKey} style={{ background: '#fffbeb' }}>
                <td style={tdStyle} />
                <td style={tdStyle}>
                  <input type="date" className="input" style={{ fontSize: 11 }}
                    value={e.entry_date}
                    onChange={ev => updateNewRow(e._localId!, 'entry_date', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 90 }}
                    placeholder="Vouc. No" value={e.reference ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'reference', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 90 }}
                    placeholder="Project" value={m.project ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.project', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 90 }}
                    placeholder="AC No." value={m.ac_lawan ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.ac_lawan', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 180 }}
                    placeholder="Description" value={e.description ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'description', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 120 }}
                    placeholder="Transaction" value={m.transaction_category ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.transaction_category', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input className="input" style={{ fontSize: 11, width: 70 }}
                    placeholder="Ref." value={m.ref ?? ''}
                    onChange={ev => updateNewRow(e._localId!, 'meta.ref', ev.target.value)} />
                </td>
                <td style={tdStyle}>
                  <input type="number" className="input" style={{ fontSize: 11, width: 110, textAlign: 'right' }}
                    placeholder="0" value={m.amount_in ?? ''}
                    onChange={ev => {
                      updateNewRow(e._localId!, 'meta.amount_in', ev.target.value);
                      if (Number(ev.target.value) > 0) updateNewRow(e._localId!, 'amount', ev.target.value);
                    }} />
                </td>
                <td style={tdStyle}>
                  <input type="number" className="input" style={{ fontSize: 11, width: 110, textAlign: 'right' }}
                    placeholder="0" value={m.amount_out ?? ''}
                    onChange={ev => {
                      updateNewRow(e._localId!, 'meta.amount_out', ev.target.value);
                      if (Number(ev.target.value) > 0) updateNewRow(e._localId!, 'amount', ev.target.value);
                    }} />
                </td>
                <td style={tdStyle}>
                  <COASelect value={e.dr_account_code ?? ''} coas={coas}
                    onChange={v => updateNewRow(e._localId!, 'dr_account_code', v)} />
                </td>
                <td style={tdStyle}>
                  <COASelect value={e.cr_account_code ?? ''} coas={coas}
                    onChange={v => updateNewRow(e._localId!, 'cr_account_code', v)} />
                </td>
                <td style={tdStyle}><span className="badge badge-amber">Baru</span></td>
                <td style={tdStyle}>
                  <div className="flex gap-1">
                    <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }}
                      onClick={() => saveNewRow(e)}>Simpan</button>
                    <button onClick={() => deleteRow(e)}><Trash2 size={12} style={{ color: '#dc2626' }} /></button>
                  </div>
                </td>
              </tr>
            );
          }

          return (
            <tr key={rowKey} style={{ background: rowBg, opacity: isPosted ? 0.75 : 1 }}>
              <td style={tdStyle}>
                {!isPosted && <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(e.id!)} />}
              </td>
              <td style={tdStyle}>{e.entry_date ? formatDate(e.entry_date) : '-'}</td>
              <td style={tdStyle}><span className="tbl-mono" style={{ fontSize: 11 }}>{e.reference ?? '-'}</span></td>
              <td style={tdStyle}>{m.project ?? '-'}</td>
              <td style={tdStyle}><span className="tbl-mono" style={{ fontSize: 11 }}>{m.ac_lawan ?? '-'}</span></td>
              <td style={tdStyle}><div style={{ maxWidth: 200, fontSize: 11 }}>{e.description ?? '-'}</div></td>
              <td style={tdStyle}><div style={{ maxWidth: 130, fontSize: 11, color: 'var(--color-text-muted)' }}>{m.transaction_category ?? '-'}</div></td>
              <td style={tdStyle}><span className="tbl-mono" style={{ fontSize: 11 }}>{m.ref ?? '-'}</span></td>
              <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: amountIn > 0 ? 600 : 400 }}>
                {amountIn > 0 ? formatRupiah(amountIn) : '-'}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', color: '#dc2626', fontWeight: amountOut > 0 ? 600 : 400 }}>
                {amountOut > 0 ? formatRupiah(amountOut) : '-'}
              </td>
              <td style={tdStyle}>
                <COASelect value={e.dr_account_code ?? ''} coas={coas} disabled={isPosted}
                  onChange={v => updateAccount(e, 'dr_account_code', v)} />
              </td>
              <td style={tdStyle}>
                <COASelect value={e.cr_account_code ?? ''} coas={coas} disabled={isPosted}
                  onChange={v => updateAccount(e, 'cr_account_code', v)} />
              </td>
              <td style={tdStyle}><StatusBadge status={e.status} journal_code={e.journal_code} /></td>
              <td style={tdStyle}>
                {!isPosted && <button onClick={() => deleteRow(e)}><Trash2 size={12} style={{ color: '#dc2626' }} /></button>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
