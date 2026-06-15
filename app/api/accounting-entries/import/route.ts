// app/api/accounting-entries/import/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, badRequest, serverError } from '@/app/lib/response';
import * as XLSX from 'xlsx';

// ── Helpers ───────────────────────────────────────────────────────────────────
function toDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  if (typeof val === 'string') {
    const s = val.trim();
    // DD/MM/YYYY
    const dmySlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmySlash) return `${dmySlash[3]}-${dmySlash[2].padStart(2,'0')}-${dmySlash[1].padStart(2,'0')}`;
    // DD-MM-YYYY or DD-MMM-YY
    const dmyDash = s.match(/^(\d{1,2})-(\w+)-(\d{2,4})$/);
    if (dmyDash) {
      const months: Record<string,string> = {
        jan:'01',feb:'02',mar:'03',apr:'04',mei:'05',may:'05',jun:'06',
        jul:'07',agu:'08',aug:'08',sep:'09',okt:'10',oct:'10',nov:'11',des:'12',dec:'12'
      };
      const m = months[dmyDash[2].toLowerCase().slice(0,3)];
      const y = dmyDash[3].length === 2 ? '20' + dmyDash[3] : dmyDash[3];
      if (m) return `${y}-${m}-${dmyDash[1].padStart(2,'0')}`;
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  }
  return null;
}

function toNum(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.-]/g,'')) || 0;
  return 0;
}

function str(val: unknown): string {
  if (val == null) return '';
  return String(val).trim();
}

// Read sheet as array of arrays (values only, uses cached formula results)
function sheetToRows(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true });
}

// Find the header row index by looking for a known column name
function findHeaderRow(rows: unknown[][], ...keywords: string[]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i] as string[];
    const rowStr = row.map(c => str(c).toLowerCase()).join('|');
    if (keywords.every(k => rowStr.includes(k.toLowerCase()))) return i;
  }
  return -1;
}

// ── AR Parser — sheet: SALES ─────────────────────────────────────────────────
// Header: No SO | Customer | No NPWP | Item | PO No. | Date Invoice | Invoice |
//         Date | No Kwitansi | NILAI KONTRAK | DPP | DPP LAINNYA |
//         PPN Bendaharawan | PPN | PPh 23 | PPh 22 | PIUTANG | ... | No Faktur
function parseAR(wb: XLSX.WorkBook): object[] {
  const ws = wb.Sheets['SALES'];
  if (!ws) throw new Error('Sheet "SALES" tidak ditemukan di file');

  const rows = sheetToRows(ws);
  const hi   = findHeaderRow(rows, 'customer', 'invoice', 'piutang');
  if (hi < 0) throw new Error('Header row tidak ditemukan di sheet SALES');

  const header = (rows[hi] as string[]).map(c => str(c).toLowerCase().trim());
  const idx = (name: string) => header.findIndex(h => h.includes(name.toLowerCase()));

  const iSO       = header.findIndex(h => h === 'no so' || h.includes('no so'));
  const iCust     = idx('customer');
  const iNPWP     = idx('npwp');
  const iItem     = idx('item');
  const iPONo     = header.findIndex(h => h === 'po no.' || h === 'po no' || (h.startsWith('po') && h.includes('no')));
  const iDateInv  = idx('date invoice') >= 0 ? idx('date invoice') : idx('date');
  const iInvoice  = idx('invoice');
  const iNilai    = header.findIndex(h => h.includes('nilai kontrak'));
  const iDPP      = header.findIndex(h => h === 'dpp' || h === 'dpp ');
  const iDPPLain  = idx('dpp lainnya');
  const iPPNBend  = idx('ppn bendaharawan') >= 0 ? idx('ppn bendaharawan') : idx('ppn bend');
  const iPPN      = header.findIndex(h => h.trim() === 'ppn' || h.trim() === 'ppn ');
  const iPPh23    = header.findIndex(h => h.includes('pph 23') || h.includes('pph23'));
  const iPPh22    = header.findIndex(h => h.includes('pph 22') || h.includes('pph22'));
  const iPiutang  = idx('piutang');
  const iNoFaktur = header.findIndex(h => h.includes('faktur'));

  const results: object[] = [];

  for (let r = hi + 1; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    const customer  = str(row[iCust]);
    const invoice   = str(row[iInvoice]);
    if (!customer && !invoice) continue;

    const dateInv   = toDate(row[iDateInv]);
    if (!dateInv) continue;

    const soCode       = iSO >= 0 ? str(row[iSO]) : '';
    const npwp         = iNPWP >= 0 ? str(row[iNPWP]) : '';
    const item         = iItem >= 0 ? str(row[iItem]) : '';
    const poNo         = iPONo >= 0 ? str(row[iPONo]) : '';
    const nilaiKontrak = iNilai >= 0 ? toNum(row[iNilai]) : 0;
    const dpp          = iDPP >= 0 ? toNum(row[iDPP]) : 0;
    const dppLain      = iDPPLain >= 0 ? toNum(row[iDPPLain]) : 0;
    const ppnBend      = iPPNBend >= 0 ? toNum(row[iPPNBend]) : 0;
    const ppn          = iPPN >= 0 ? toNum(row[iPPN]) : 0;
    const pph23        = iPPh23 >= 0 ? toNum(row[iPPh23]) : 0;
    const pph22        = iPPh22 >= 0 ? toNum(row[iPPh22]) : 0;
    const piutang      = iPiutang >= 0 ? toNum(row[iPiutang]) : 0;
    const noFaktur     = iNoFaktur >= 0 ? str(row[iNoFaktur]) : '';

    results.push({
      entry_type: 'AR',
      source_type: 'manual',
      entry_date: dateInv,
      description: `${customer} — ${invoice}`,
      reference: invoice,
      amount: piutang || dpp,
      meta: {
        so_code: soCode,
        customer_name: customer,
        npwp,
        item,
        po_no: poNo,
        invoice_no: invoice,
        nilai_kontrak: nilaiKontrak,
        dpp,
        dpp_lainnya: dppLain,
        ppn_bendaharawan: ppnBend,
        ppn,
        pph_22: pph22,
        pph_23: pph23,
        piutang,
        no_faktur: noFaktur,
      },
    });
  }

  return results;
}

// ── AP Parser — sheet: PURCHASES ────────────────────────────────────────────
// Header: Code | Suppliers | Item | Date | Sales Order | PO No. | Date Inv. |
//         Invoice | Amount | VAT | PPH 23 | A/P | ... | Status
function parseAP(wb: XLSX.WorkBook): object[] {
  const ws = wb.Sheets['PURCHASES'];
  if (!ws) throw new Error('Sheet "PURCHASES" tidak ditemukan di file');

  const rows = sheetToRows(ws);
  const hi   = findHeaderRow(rows, 'suppliers', 'amount');
  if (hi < 0) throw new Error('Header row tidak ditemukan di sheet PURCHASES');

  const header = (rows[hi] as string[]).map(c => str(c).toLowerCase().trim());
  const idx = (name: string) => header.findIndex(h => h.includes(name.toLowerCase()));

  const iCode     = header.findIndex(h => h === 'code');
  const iSupplier = idx('supplier');
  const iItem     = idx('item');
  const iSO       = idx('sales order');
  const iPONo     = header.findIndex(h => h === 'po no.' || h === 'po no');
  const iDateInv  = idx('date inv') >= 0 ? idx('date inv') : idx('date');
  const iInvoice  = idx('invoice');
  const iAmount   = idx('amount');
  const iVAT      = idx('vat');
  const iPPH23    = header.findIndex(h => h.includes('pph 23') || h.includes('pph23'));
  const iAP       = header.findIndex(h => h.trim() === 'a/p');
  const iStatus   = header.findIndex(h => h === 'status');

  const results: object[] = [];

  for (let r = hi + 1; r < rows.length; r++) {
    const row      = rows[r] as unknown[];
    const supplier = str(row[iSupplier]);
    const amount   = toNum(row[iAmount]);
    if (!supplier) continue;

    const dateInv  = toDate(row[iDateInv]);
    if (!dateInv) continue;

    const code     = iCode >= 0 ? str(row[iCode]) : '';
    const soCode   = iSO >= 0 ? str(row[iSO]) : '';
    const poNo     = iPONo >= 0 ? str(row[iPONo]) : '';
    const item     = iItem >= 0 ? str(row[iItem]) : '';
    const invoice  = iInvoice >= 0 ? str(row[iInvoice]) : '';
    const vat      = iVAT >= 0 ? toNum(row[iVAT]) : 0;
    const pph23    = iPPH23 >= 0 ? toNum(row[iPPH23]) : 0;
    const ap       = iAP >= 0 ? toNum(row[iAP]) : amount;
    const apStatus = iStatus >= 0 ? str(row[iStatus]) : '';

    results.push({
      entry_type: 'AP',
      source_type: 'manual',
      entry_date: dateInv,
      description: `${supplier}${item ? ' — ' + item : ''}`,
      reference: invoice || undefined,
      amount: ap || amount,
      meta: {
        code,
        supplier_name: supplier,
        item,
        so_code: soCode,
        po_no: poNo,
        invoice_no: invoice,
        vat,
        pph_23: pph23,
        ap_amount: ap || amount,
        ap_status: apStatus,
      },
    });
  }

  return results;
}

// ── Bank Parser — sheet: BCA ────────────────────────────────────────────────
// Header row 7: Date | Vouc.No. | Project | AC No. | Description | Transaction | Ref. | In | Out
function parseBank(wb: XLSX.WorkBook): object[] {
  // Try BCA sheet first, then fall back to any sheet with date+in+out pattern
  const sheetName = wb.SheetNames.find(n =>
    n.toLowerCase().includes('bca') ||
    n.toLowerCase().includes('mandiri') ||
    n.toLowerCase().includes('bank')
  ) ?? wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('Sheet bank tidak ditemukan');

  const rows = sheetToRows(ws);
  const hi   = findHeaderRow(rows, 'date', 'description');
  if (hi < 0) throw new Error('Header row tidak ditemukan di sheet bank');

  const header = (rows[hi] as string[]).map(c => str(c).toLowerCase());
  const idx = (name: string) => header.findIndex(h => h.includes(name.toLowerCase()));

  const iDate  = idx('date');
  const iVouc  = header.findIndex(h => h.includes('vouc'));
  const iProj  = idx('project');
  const iAC    = header.findIndex(h => h.includes('ac no') || h === 'ac no.');
  const iDesc  = idx('description');
  const iTrans = header.findIndex(h => h.trim() === 'transaction');
  const iRef   = header.findIndex(h => h.trim() === 'ref.' || h.trim() === 'ref');
  const iIn    = header.findIndex(h => h.trim() === 'in');
  const iOut   = header.findIndex(h => h.trim() === 'out');

  const results: object[] = [];

  for (let r = hi + 1; r < rows.length; r++) {
    const row   = rows[r] as unknown[];
    const date  = toDate(row[iDate]);
    if (!date) continue;

    const amtIn  = iIn >= 0 ? toNum(row[iIn]) : 0;
    const amtOut = iOut >= 0 ? toNum(row[iOut]) : 0;
    if (amtIn === 0 && amtOut === 0) continue;

    const desc  = iDesc >= 0 ? str(row[iDesc]) : '';
    const vouc  = iVouc >= 0 ? str(row[iVouc]) : '';
    const proj  = iProj >= 0 ? str(row[iProj]) : '';
    const acNo  = iAC >= 0 ? str(row[iAC]) : '';
    const trans = iTrans >= 0 ? str(row[iTrans]) : '';
    const ref   = iRef >= 0 ? str(row[iRef]) : '';

    results.push({
      entry_type: 'Bank',
      source_type: 'manual',
      entry_date: date,
      description: desc || trans || (amtIn > 0 ? 'Penerimaan' : 'Pengeluaran'),
      reference: vouc || ref || undefined,
      amount: amtIn > 0 ? amtIn : amtOut,
      meta: {
        project: proj,
        ac_lawan: acNo,
        transaction_desc: desc,
        transaction_category: trans,
        ref,
        amount_in: amtIn > 0 ? amtIn : 0,
        amount_out: amtOut > 0 ? amtOut : 0,
      },
    });
  }

  return results;
}

// ── Route Handler ─────────────────────────────────────────────────────────────
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const type = form.get('type') as string | null;

    if (!file) return badRequest('file wajib');
    if (!type || !['AR','AP','Bank'].includes(type)) return badRequest('type harus AR | AP | Bank');

    const buffer  = Buffer.from(await file.arrayBuffer());
    const wb      = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    let parsed: object[];
    if (type === 'AR')   parsed = parseAR(wb);
    else if (type === 'AP') parsed = parseAP(wb);
    else                 parsed = parseBank(wb);

    if (!parsed.length) return badRequest('Tidak ada data yang bisa dibaca dari file');

    // Batch insert
    let inserted = 0;
    for (let i = 0; i < parsed.length; i++) {
      const e = parsed[i] as any;
      const entry_code = `AE-${type}-${Date.now()}-${i}`;
      try {
        await query(
          `INSERT INTO accounting_entries
             (entry_code,entry_type,source_type,source_ref,entry_date,description,reference,
              amount,dr_account_code,cr_account_code,status,meta,created_by,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,NULL,NULL,'draft',?,?,NOW(),NOW())`,
          [
            entry_code, type,
            e.source_type ?? 'manual',
            e.source_ref ?? null,
            e.entry_date,
            e.description ?? null,
            e.reference ?? null,
            Number(e.amount) || 0,
            JSON.stringify(e.meta ?? {}),
            user.user_code,
          ]
        );
        inserted++;
      } catch {
        // skip duplicates or bad rows
      }
    }

    return ok({ imported: inserted, total_parsed: parsed.length });
  } catch (err: any) {
    if (err?.message) return badRequest(err.message);
    return serverError(err);
  }
});
