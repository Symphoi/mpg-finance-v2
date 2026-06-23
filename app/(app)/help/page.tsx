'use client';
import { useState, useRef } from 'react';
import {
  BookOpen, FileText, ChevronRight, Globe, CheckCircle2,
  Download, Upload, Plus, Send, ArrowRight, Info, AlertCircle,
  Landmark, Receipt, Building2
} from 'lucide-react';

type Lang = 'id' | 'en';

// ── Content ───────────────────────────────────────────────────────────────────
const CONTENT = {
  id: {
    title: 'Panduan Pengguna',
    subtitle: 'Dokumentasi lengkap cara penggunaan sistem Finance',
    toc: [
      { id: 'overview',        label: 'Gambaran Umum' },
      { id: 'accounting-entry',label: 'Accounting Entry' },
      { id: 'ar',              label: '— Tab AR (Piutang)' },
      { id: 'ap',              label: '— Tab AP (Hutang)' },
      { id: 'bank',            label: '— Tab Bank' },
      { id: 'post',            label: '— Posting Jurnal' },
      { id: 'reports',         label: 'Laporan Keuangan' },
      { id: 'tips',            label: 'Tips & Catatan' },
    ],
    sections: {
      overview: {
        title: 'Gambaran Umum',
        icon: 'Building2',
        body: `Sistem Finance ini adalah ERP keuangan yang dirancang untuk mencatat transaksi bisnis secara manual maupun otomatis. Alur utama sistem adalah:`,
        flow: [
          { step: 'Sales Order', desc: 'Pembuatan order penjualan' },
          { step: 'Delivery Order', desc: 'Pengiriman barang ke klien → AR dibuat otomatis' },
          { step: 'Purchase Order', desc: 'Pembelian ke supplier → diapprove Finance → AP dibuat' },
          { step: 'Invoice Payment', desc: 'Pembayaran piutang dari customer' },
          { step: 'Accounting Entry', desc: 'Assign akun Debit/Kredit → Post ke jurnal' },
          { step: 'Laporan', desc: 'Trial Balance, General Ledger, Income Statement, Balance Sheet' },
        ],
        note: 'Semua pencatatan jurnal dilakukan secara MANUAL melalui modul Accounting Entry. Sistem tidak membuat jurnal otomatis.',
      },
      accountingEntry: {
        title: 'Modul Accounting Entry',
        icon: 'FileText',
        body: `Accounting Entry adalah pusat pencatatan jurnal double-entry. Setiap transaksi AR, AP, dan Bank harus di-assign akun Debit dan Kredit sebelum bisa diposting ke jurnal.`,
        statuses: [
          { label: 'Draft', color: 'amber', desc: 'Entry sudah diinput, belum diposting. Dr/Cr akun bisa diubah.' },
          { label: 'Posted', color: 'green', desc: 'Entry sudah diposting ke jurnal. Tidak bisa diubah.' },
        ],
      },
      ar: {
        title: 'Tab AR — Piutang',
        icon: 'Receipt',
        body: 'Tab ini mencatat semua piutang (Account Receivable) dari customer.',
        sources: [
          {
            icon: 'Download',
            title: 'Tarik dari Sistem',
            desc: 'Ambil data AR yang sudah ada di sistem (dibuat saat DO delivered). Hanya AR yang belum pernah ditarik yang akan muncul.',
            steps: [
              'Klik tombol "Tarik dari Sistem"',
              'Data AR dari tabel accounts_receivable akan ditambahkan sebagai draft',
              'Assign Dr Akun dan Cr Akun per baris',
              'Centang baris yang ingin diposting → klik "Post Journal"',
            ],
          },
          {
            icon: 'Upload',
            title: 'Import Excel',
            desc: 'Import data dari file Excel klien. File harus mengandung sheet bernama SALES.',
            steps: [
              'Download template terlebih dahulu (tombol "Template")',
              'Isi data sesuai kolom template',
              'Klik "Import Excel" → pilih file .xlsx',
              'Data akan masuk sebagai draft',
            ],
            cols: ['No SO', 'Customer', 'No NPWP', 'Item', 'PO No.', 'Tgl Invoice', 'No Invoice', 'NILAI KONTRAK', 'DPP', 'DPP LAINNYA', 'PPN Bendaharawan', 'PPN', 'PPh 23', 'PPh 22', 'PIUTANG', 'No Faktur'],
          },
          {
            icon: 'Plus',
            title: 'Input Manual',
            desc: 'Tambah baris satu per satu secara manual.',
            steps: [
              'Klik "Tambah Baris"',
              'Isi semua field yang diperlukan',
              'Klik "Simpan" untuk menyimpan baris',
            ],
          },
        ],
      },
      ap: {
        title: 'Tab AP — Hutang',
        icon: 'Landmark',
        body: 'Tab ini mencatat semua hutang (Account Payable) ke supplier.',
        sources: [
          {
            icon: 'Download',
            title: 'Tarik dari Sistem',
            desc: 'Ambil data PO yang sudah diapprove Finance (status: approved atau paid). PO yang sudah pernah ditarik tidak akan muncul lagi.',
            steps: [
              'Klik "Tarik dari Sistem"',
              'PO status approved/paid akan ditambahkan sebagai draft',
              'Assign Dr Akun dan Cr Akun',
              'Post Journal',
            ],
          },
          {
            icon: 'Upload',
            title: 'Import Excel',
            desc: 'Import dari file Excel dengan sheet bernama PURCHASES.',
            steps: [
              'Download template (tombol "Template")',
              'Isi data sesuai kolom',
              'Import file .xlsx',
            ],
            cols: ['Code', 'Supplier', 'Item', 'Tgl', 'Sales Order', 'PO No.', 'No Invoice', 'Amount', 'VAT', 'PPH 23', 'A/P', 'Status PO'],
          },
          {
            icon: 'Plus',
            title: 'Input Manual',
            desc: 'Klik "Tambah Baris" dan isi field secara manual.',
            steps: ['Klik "Tambah Baris"', 'Isi semua field', 'Klik "Simpan"'],
          },
        ],
      },
      bank: {
        title: 'Tab Bank',
        icon: 'Landmark',
        body: 'Tab ini mencatat mutasi rekening bank. Tidak ada "Tarik dari Sistem" — data harus diimport dari file mutasi bank atau diinput manual.',
        sources: [
          {
            icon: 'Upload',
            title: 'Import Excel (Mutasi Bank)',
            desc: 'Import file mutasi dari bank (BCA, Mandiri, dll). Sistem mendeteksi sheet otomatis berdasarkan nama sheet yang mengandung kata "bca", "mandiri", atau "bank".',
            steps: [
              'Export mutasi rekening dari aplikasi/website bank dalam format Excel',
              'Klik "Import Excel" → pilih file',
              'Sistem akan membaca kolom: Tanggal, Vouc. No, Project, AC No., Description, Transaction, Ref., Masuk, Keluar',
              'Data masuk sebagai draft',
            ],
          },
          {
            icon: 'Plus',
            title: 'Input Manual',
            desc: 'Untuk transaksi yang tidak ada di mutasi bank.',
            steps: ['Klik "Tambah Baris"', 'Isi Tanggal, Keterangan, Masuk/Keluar', 'Klik "Simpan"'],
          },
        ],
      },
      post: {
        title: 'Posting Jurnal',
        icon: 'Send',
        body: 'Proses mengubah entry dari Draft menjadi Posted dan membuat jurnal double-entry di sistem.',
        steps: [
          { num: '1', title: 'Assign Akun Dr & Cr', desc: 'Setiap baris harus memiliki akun Debit dan Kredit. Pilih dari dropdown Chart of Account. Entry tanpa akun lengkap tidak bisa diposting.' },
          { num: '2', title: 'Centang Baris', desc: 'Centang baris yang ingin diposting. Bisa centang semua sekaligus menggunakan checkbox di header.' },
          { num: '3', title: 'Klik "Post Journal"', desc: 'Tombol di kanan atas toolbar menunjukkan jumlah entry yang dipilih. Klik untuk memposting.' },
          { num: '4', title: 'Jurnal Dibuat', desc: 'Sistem membuat manual_journal dan 2 journal_items (Debit + Kredit) untuk setiap entry. Status berubah menjadi Posted dan kode jurnal muncul di kolom Status.' },
        ],
        warning: 'Entry yang sudah Posted TIDAK BISA diubah atau dihapus. Pastikan akun Dr/Cr sudah benar sebelum posting.',
      },
      reports: {
        title: 'Laporan Keuangan',
        icon: 'BookOpen',
        body: 'Semua laporan dibaca dari tabel journal_entries dan journal_items yang sudah diposting.',
        items: [
          { label: 'Trial Balance', desc: 'Saldo semua akun dalam periode tertentu. Filter per perusahaan dan periode.' },
          { label: 'General Ledger', desc: 'Detail mutasi per akun. Lihat semua transaksi yang mempengaruhi satu akun.' },
          { label: 'Income Statement', desc: 'Laporan laba rugi: pendapatan dikurangi beban.' },
          { label: 'Balance Sheet', desc: 'Neraca: aset = liabilitas + ekuitas.' },
          { label: 'Intercompany', desc: 'Transaksi antar perusahaan dalam satu grup.' },
        ],
        exportNote: 'Semua laporan bisa diekspor ke Excel menggunakan tombol "Export" di kanan atas setiap halaman laporan.',
      },
      tips: {
        title: 'Tips & Catatan Penting',
        icon: 'Info',
        items: [
          { type: 'tip', text: 'Filter bulan di pojok kanan atas Accounting Entry untuk melihat data per periode.' },
          { type: 'tip', text: 'Gunakan tombol "Refresh" (ikon putar) jika data tidak muncul setelah import.' },
          { type: 'tip', text: 'Template Excel bisa didownload langsung dari halaman Accounting Entry — pastikan format kolom tidak diubah.' },
          { type: 'warning', text: 'Jangan posting entry dengan akun yang salah — tidak bisa di-undo. Jika sudah terlanjur, buat manual journal reversal.' },
          { type: 'warning', text: 'Import Excel Bank: nama sheet harus mengandung "bca", "mandiri", atau "bank" agar terdeteksi otomatis.' },
          { type: 'info', text: '"Tarik dari Sistem" AR hanya mengambil AR yang belum pernah ditarik. AR duplikat tidak akan muncul.' },
          { type: 'info', text: '"Tarik dari Sistem" AP hanya mengambil PO dengan status approved atau paid.' },
        ],
      },
    },
  },
  en: {
    title: 'User Guide',
    subtitle: 'Complete documentation for using the Finance system',
    toc: [
      { id: 'overview',        label: 'System Overview' },
      { id: 'accounting-entry',label: 'Accounting Entry' },
      { id: 'ar',              label: '— AR Tab (Receivables)' },
      { id: 'ap',              label: '— AP Tab (Payables)' },
      { id: 'bank',            label: '— Bank Tab' },
      { id: 'post',            label: '— Posting Journals' },
      { id: 'reports',         label: 'Financial Reports' },
      { id: 'tips',            label: 'Tips & Notes' },
    ],
    sections: {
      overview: {
        title: 'System Overview',
        icon: 'Building2',
        body: 'This Finance ERP is designed to record business transactions both manually and automatically. The main flow is:',
        flow: [
          { step: 'Sales Order', desc: 'Create a sales order' },
          { step: 'Delivery Order', desc: 'Deliver goods to client → AR created automatically' },
          { step: 'Purchase Order', desc: 'Purchase from supplier → Finance approval → AP created' },
          { step: 'Invoice Payment', desc: 'Receive payment from customer' },
          { step: 'Accounting Entry', desc: 'Assign Debit/Credit accounts → Post to journal' },
          { step: 'Reports', desc: 'Trial Balance, General Ledger, Income Statement, Balance Sheet' },
        ],
        note: 'All journal entries are made MANUALLY through the Accounting Entry module. The system does not create automatic journals.',
      },
      accountingEntry: {
        title: 'Accounting Entry Module',
        icon: 'FileText',
        body: 'Accounting Entry is the central hub for double-entry journal recording. Every AR, AP, and Bank transaction must have Debit and Credit accounts assigned before it can be posted to a journal.',
        statuses: [
          { label: 'Draft', color: 'amber', desc: 'Entry has been created but not yet posted. Dr/Cr accounts can still be changed.' },
          { label: 'Posted', color: 'green', desc: 'Entry has been posted to the journal. Cannot be changed.' },
        ],
      },
      ar: {
        title: 'AR Tab — Receivables',
        icon: 'Receipt',
        body: 'This tab records all Accounts Receivable from customers.',
        sources: [
          {
            icon: 'Download',
            title: 'Pull from System',
            desc: 'Fetch AR records already in the system (created when a DO is delivered). Only AR that has never been pulled will appear.',
            steps: [
              'Click "Tarik dari Sistem" button',
              'AR data from accounts_receivable table is added as drafts',
              'Assign Dr Account and Cr Account per row',
              'Check rows to post → click "Post Journal"',
            ],
          },
          {
            icon: 'Upload',
            title: 'Import Excel',
            desc: 'Import data from a client Excel file. The file must contain a sheet named SALES.',
            steps: [
              'Download the template first (click "Template" button)',
              'Fill in data according to the template columns',
              'Click "Import Excel" → select .xlsx file',
              'Data will be added as drafts',
            ],
            cols: ['No SO', 'Customer', 'No NPWP', 'Item', 'PO No.', 'Invoice Date', 'Invoice No.', 'CONTRACT VALUE', 'DPP', 'DPP OTHER', 'VAT Treasurer', 'VAT', 'WHT 23', 'WHT 22', 'RECEIVABLE', 'Tax Invoice No.'],
          },
          {
            icon: 'Plus',
            title: 'Manual Input',
            desc: 'Add rows one by one manually.',
            steps: [
              'Click "Tambah Baris"',
              'Fill in all required fields',
              'Click "Simpan" to save the row',
            ],
          },
        ],
      },
      ap: {
        title: 'AP Tab — Payables',
        icon: 'Landmark',
        body: 'This tab records all Accounts Payable to suppliers.',
        sources: [
          {
            icon: 'Download',
            title: 'Pull from System',
            desc: 'Fetch POs that have been approved by Finance (status: approved or paid). Already-pulled POs will not appear again.',
            steps: [
              'Click "Tarik dari Sistem"',
              'Approved/paid POs will be added as drafts',
              'Assign Dr Account and Cr Account',
              'Post Journal',
            ],
          },
          {
            icon: 'Upload',
            title: 'Import Excel',
            desc: 'Import from an Excel file with a sheet named PURCHASES.',
            steps: [
              'Download template (click "Template")',
              'Fill in data according to columns',
              'Import .xlsx file',
            ],
            cols: ['Code', 'Supplier', 'Item', 'Date', 'Sales Order', 'PO No.', 'Invoice No.', 'Amount', 'VAT', 'WHT 23', 'A/P', 'PO Status'],
          },
          {
            icon: 'Plus',
            title: 'Manual Input',
            desc: 'Click "Tambah Baris" and fill in the fields manually.',
            steps: ['Click "Tambah Baris"', 'Fill in all fields', 'Click "Simpan"'],
          },
        ],
      },
      bank: {
        title: 'Bank Tab',
        icon: 'Landmark',
        body: 'This tab records bank account transactions. There is no "Pull from System" — data must be imported from a bank statement file or entered manually.',
        sources: [
          {
            icon: 'Upload',
            title: 'Import Excel (Bank Statement)',
            desc: 'Import a bank statement file (BCA, Mandiri, etc.). The system auto-detects the sheet based on the sheet name containing "bca", "mandiri", or "bank".',
            steps: [
              'Export your bank statement from the bank\'s app/website in Excel format',
              'Click "Import Excel" → select the file',
              'System reads columns: Date, Voucher No, Project, AC No., Description, Transaction, Ref., In, Out',
              'Data is added as drafts',
            ],
          },
          {
            icon: 'Plus',
            title: 'Manual Input',
            desc: 'For transactions not in the bank statement.',
            steps: ['Click "Tambah Baris"', 'Fill in Date, Description, In/Out amount', 'Click "Simpan"'],
          },
        ],
      },
      post: {
        title: 'Posting Journals',
        icon: 'Send',
        body: 'The process of changing entries from Draft to Posted and creating a double-entry journal in the system.',
        steps: [
          { num: '1', title: 'Assign Dr & Cr Accounts', desc: 'Each row must have a Debit and Credit account. Select from the Chart of Account dropdown. Entries without complete accounts cannot be posted.' },
          { num: '2', title: 'Check Rows', desc: 'Check the rows you want to post. You can check all at once using the header checkbox.' },
          { num: '3', title: 'Click "Post Journal"', desc: 'The button at the top right of the toolbar shows the number of selected entries. Click to post.' },
          { num: '4', title: 'Journal Created', desc: 'The system creates a manual_journal and 2 journal_items (Debit + Credit) for each entry. Status changes to Posted and a journal code appears in the Status column.' },
        ],
        warning: 'Posted entries CANNOT be changed or deleted. Make sure the Dr/Cr accounts are correct before posting.',
      },
      reports: {
        title: 'Financial Reports',
        icon: 'BookOpen',
        body: 'All reports are read from posted journal_entries and journal_items.',
        items: [
          { label: 'Trial Balance', desc: 'Balance of all accounts in a given period. Filter by company and period.' },
          { label: 'General Ledger', desc: 'Detailed movements per account. View all transactions affecting a single account.' },
          { label: 'Income Statement', desc: 'Profit & loss report: revenue minus expenses.' },
          { label: 'Balance Sheet', desc: 'Balance: assets = liabilities + equity.' },
          { label: 'Intercompany', desc: 'Transactions between companies within the same group.' },
        ],
        exportNote: 'All reports can be exported to Excel using the "Export" button at the top right of each report page.',
      },
      tips: {
        title: 'Tips & Important Notes',
        icon: 'Info',
        items: [
          { type: 'tip', text: 'Use the month filter at the top right of Accounting Entry to view data by period.' },
          { type: 'tip', text: 'Click the Refresh button (rotate icon) if data doesn\'t appear after import.' },
          { type: 'tip', text: 'Excel templates can be downloaded directly from the Accounting Entry page — do not change the column format.' },
          { type: 'warning', text: 'Do not post entries with wrong accounts — it cannot be undone. If already posted, create a manual journal reversal.' },
          { type: 'warning', text: 'Bank Excel Import: the sheet name must contain "bca", "mandiri", or "bank" to be auto-detected.' },
          { type: 'info', text: '"Pull from System" AR only fetches AR that has never been pulled before. Duplicates will not appear.' },
          { type: 'info', text: '"Pull from System" AP only fetches POs with approved or paid status.' },
        ],
      },
    },
  },
};

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Building2, FileText, Receipt, Landmark, Send, BookOpen, Info,
  Download, Upload, Plus,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function tipStyle(type: string) {
  if (type === 'warning') return { bg: '#fef3c7', icon: '⚠️' };
  if (type === 'info')    return { bg: '#eff6ff', icon: 'ℹ️' };
  return                         { bg: '#f0fdf4', icon: '✅' };
}

function sourceIcon(name: string) {
  if (name === 'Download') return <Download size={14} />;
  if (name === 'Upload')   return <Upload size={14} />;
  return <Plus size={14} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HelpPage() {
  const [lang, setLang] = useState<Lang>('id');
  const [active, setActive] = useState('overview');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const c = CONTENT[lang];
  const s = c.sections;

  const scrollTo = (id: string) => {
    setActive(id);
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const Section = ({ id, children }: { id: string; children: React.ReactNode }) => (
    <div ref={el => { sectionRefs.current[id] = el; }} id={id} className="scroll-mt-6">
      {children}
    </div>
  );

  return (
    <div className="flex gap-6 max-w-[1200px]">
      {/* TOC Sidebar */}
      <aside className="w-52 flex-shrink-0">
        <div className="sticky top-4 space-y-1">
          {c.toc.map(item => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id === 'accounting-entry' ? 'accounting-entry' : item.id)}
              className="w-full text-left px-3 py-1.5 rounded-lg text-[12px] transition-all"
              style={{
                background: active === item.id ? 'var(--color-primary-soft, #ede9fe)' : 'transparent',
                color: active === item.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: active === item.id ? 600 : 400,
                paddingLeft: item.label.startsWith('—') ? 20 : 12,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 space-y-8 pb-16">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: 'var(--color-text)' }}>{c.title}</h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{c.subtitle}</p>
          </div>
          {/* Lang toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <Globe size={13} style={{ color: 'var(--color-text-muted)', marginLeft: 4 }} />
            {(['id', 'en'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="px-3 py-1 rounded-md text-[12px] font-semibold transition-all"
                style={{
                  background: lang === l ? 'var(--color-primary)' : 'transparent',
                  color: lang === l ? '#fff' : 'var(--color-text-muted)',
                }}
              >
                {l === 'id' ? 'Indonesia' : 'English'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Overview ── */}
        <Section id="overview">
          <SectionCard title={s.overview.title} icon="Building2">
            <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-muted)' }}>{s.overview.body}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {s.overview.flow.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg text-[12px] font-medium border"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}>
                    <div style={{ color: 'var(--color-text)', fontWeight: 600 }}>{f.step}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{f.desc}</div>
                  </div>
                  {i < s.overview.flow.length - 1 && <ArrowRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />}
                </div>
              ))}
            </div>
            <TipBox type="info" text={s.overview.note} />
          </SectionCard>
        </Section>

        {/* ── Accounting Entry ── */}
        <Section id="accounting-entry">
          <SectionCard title={s.accountingEntry.title} icon="FileText">
            <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-muted)' }}>{s.accountingEntry.body}</p>
            <div className="flex gap-3">
              {s.accountingEntry.statuses.map(st => (
                <div key={st.label} className="flex items-start gap-2 p-3 rounded-lg border flex-1"
                  style={{ borderColor: 'var(--color-border)' }}>
                  <span className={`badge badge-${st.color} mt-0.5 flex-shrink-0`}>{st.label}</span>
                  <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>{st.desc}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </Section>

        {/* ── AR ── */}
        <Section id="ar">
          <SectionCard title={s.ar.title} icon="Receipt">
            <p className="text-[13px] mb-5" style={{ color: 'var(--color-text-muted)' }}>{s.ar.body}</p>
            <div className="space-y-4">
              {s.ar.sources.map((src, i) => (
                <SourceBlock key={i} src={src} />
              ))}
            </div>
          </SectionCard>
        </Section>

        {/* ── AP ── */}
        <Section id="ap">
          <SectionCard title={s.ap.title} icon="Landmark">
            <p className="text-[13px] mb-5" style={{ color: 'var(--color-text-muted)' }}>{s.ap.body}</p>
            <div className="space-y-4">
              {s.ap.sources.map((src, i) => (
                <SourceBlock key={i} src={src} />
              ))}
            </div>
          </SectionCard>
        </Section>

        {/* ── Bank ── */}
        <Section id="bank">
          <SectionCard title={s.bank.title} icon="Landmark">
            <p className="text-[13px] mb-5" style={{ color: 'var(--color-text-muted)' }}>{s.bank.body}</p>
            <div className="space-y-4">
              {s.bank.sources.map((src, i) => (
                <SourceBlock key={i} src={src} />
              ))}
            </div>
          </SectionCard>
        </Section>

        {/* ── Posting ── */}
        <Section id="post">
          <SectionCard title={s.post.title} icon="Send">
            <p className="text-[13px] mb-5" style={{ color: 'var(--color-text-muted)' }}>{s.post.body}</p>
            <div className="space-y-3 mb-5">
              {s.post.steps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
                    style={{ background: 'var(--color-primary)' }}>
                    {step.num}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold mb-0.5" style={{ color: 'var(--color-text)' }}>{step.title}</div>
                    <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <TipBox type="warning" text={s.post.warning} />
          </SectionCard>
        </Section>

        {/* ── Reports ── */}
        <Section id="reports">
          <SectionCard title={s.reports.title} icon="BookOpen">
            <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-muted)' }}>{s.reports.body}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {s.reports.items.map((item, i) => (
                <div key={i} className="p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={13} style={{ color: 'var(--color-primary)' }} />
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>{item.label}</span>
                  </div>
                  <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</p>
                </div>
              ))}
            </div>
            <TipBox type="tip" text={s.reports.exportNote} />
          </SectionCard>
        </Section>

        {/* ── Tips ── */}
        <Section id="tips">
          <SectionCard title={s.tips.title} icon="Info">
            <div className="space-y-3">
              {s.tips.items.map((item, i) => (
                <TipBox key={i} type={item.type as any} text={item.text} />
              ))}
            </div>
          </SectionCard>
        </Section>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const Icon = ICON_MAP[icon] ?? BookOpen;
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--color-primary-soft, #ede9fe)' }}>
          <Icon size={16} style={{ color: 'var(--color-primary)' }} />
        </div>
        <h2 className="text-[16px] font-bold" style={{ color: 'var(--color-text)' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SourceBlock({ src }: { src: any }) {
  return (
    <div className="border rounded-xl p-4" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: 'var(--color-surface-muted)' }}>
          {sourceIcon(src.icon)}
        </div>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>{src.title}</span>
      </div>
      <p className="text-[12px] mb-3" style={{ color: 'var(--color-text-muted)' }}>{src.desc}</p>
      <ol className="space-y-1 mb-3">
        {src.steps.map((step: string, i: number) => (
          <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            <ChevronRight size={12} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
            {step}
          </li>
        ))}
      </ol>
      {src.cols && (
        <div className="flex flex-wrap gap-1">
          {src.cols.map((col: string, i: number) => (
            <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono"
              style={{ background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)' }}>
              {col}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TipBox({ type, text }: { type: 'tip' | 'warning' | 'info'; text: string }) {
  const { bg, icon } = tipStyle(type);
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-[12px]"
      style={{ background: bg }}>
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <span style={{ color: '#374151' }}>{text}</span>
    </div>
  );
}
