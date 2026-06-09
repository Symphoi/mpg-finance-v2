import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';
import { createCommodityJournal } from '@/lib/accounting';

const COMMODITY_LABEL: Record<'gold' | 'wood', string> = { gold: 'Emas', wood: 'Kayu' };

async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS commodity_investments (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      investment_code  VARCHAR(50)  NOT NULL UNIQUE,
      commodity_type   ENUM('gold','wood') NOT NULL,
      project_code     VARCHAR(50)  DEFAULT NULL,
      invest_date      DATE         NOT NULL,
      modal_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
      total_return     DECIMAL(15,2) NOT NULL DEFAULT 0,
      notes            TEXT         DEFAULT NULL,
      status           ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
      created_by       VARCHAR(50),
      created_at       DATETIME     DEFAULT NOW(),
      updated_at       DATETIME     DEFAULT NOW(),
      INDEX idx_type   (commodity_type),
      INDEX idx_status (status),
      INDEX idx_project(project_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`ALTER TABLE commodity_investments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  try { await query(`ALTER TABLE commodity_investments ADD COLUMN bank_account_code VARCHAR(50) DEFAULT NULL`); } catch {}
  try { await query(`ALTER TABLE commodity_investments ADD COLUMN journal_code VARCHAR(50) DEFAULT NULL`); } catch {}
  await query(`
    CREATE TABLE IF NOT EXISTS commodity_returns (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      return_code      VARCHAR(50)  NOT NULL UNIQUE,
      investment_code  VARCHAR(50)  NOT NULL,
      return_date      DATE         NOT NULL,
      amount           DECIMAL(15,2) NOT NULL,
      notes            TEXT         DEFAULT NULL,
      created_by       VARCHAR(50),
      created_at       DATETIME     DEFAULT NOW(),
      INDEX idx_inv    (investment_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`ALTER TABLE commodity_returns CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await query(`
    CREATE TABLE IF NOT EXISTS commodity_expenses (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      expense_code     VARCHAR(50)   NOT NULL UNIQUE,
      investment_code  VARCHAR(50)   NOT NULL,
      expense_date     DATE          NOT NULL,
      description      VARCHAR(255)  NOT NULL,
      amount           DECIMAL(15,2) NOT NULL,
      notes            TEXT          DEFAULT NULL,
      created_by       VARCHAR(50),
      created_at       DATETIME      DEFAULT NOW(),
      INDEX idx_inv    (investment_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export const GET = withAuth(async (req: NextRequest) => {
  try {
    await ensureTables();
    const url    = new URL(req.url);
    const action = url.searchParams.get('action') ?? '';

    // Summary mode
    if (action === 'summary') {
      const [row] = await query(`
        SELECT
          COALESCE(SUM(ci.modal_amount), 0) AS total_modal,
          COALESCE(SUM(ci.total_return), 0) AS total_return,
          COALESCE((SELECT SUM(amount) FROM commodity_expenses), 0) AS total_expenses,
          COALESCE(SUM(ci.total_return) - SUM(ci.modal_amount), 0)
            - COALESCE((SELECT SUM(amount) FROM commodity_expenses), 0) AS profit_loss,
          COUNT(*) AS total_count,
          SUM(CASE WHEN ci.status='active' THEN 1 ELSE 0 END) AS active_count
        FROM commodity_investments ci
      `) as any[];
      return ok(row);
    }

    const page   = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const type   = url.searchParams.get('type')   ?? '';
    const status = url.searchParams.get('status') ?? '';

    const conds: string[]  = [];
    const params: unknown[] = [];
    if (type)   { conds.push('ci.commodity_type = ?'); params.push(type); }
    if (status) { conds.push('ci.status = ?');         params.push(status); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [rows, count] = await Promise.all([
      query(`
        SELECT ci.*,
          p.name AS project_name,
          COALESCE((SELECT SUM(ce.amount) FROM commodity_expenses ce WHERE ce.investment_code = ci.investment_code), 0) AS total_expenses
        FROM commodity_investments ci
        LEFT JOIN projects p ON ci.project_code = p.project_code
        ${where}
        ORDER BY ci.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM commodity_investments ci ${where}`, params),
    ]);

    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    await ensureTables();
    const { commodity_type, project_code, invest_date, modal_amount, bank_account_code, notes } = await req.json();

    if (!commodity_type || !invest_date || !modal_amount) {
      return badRequest('commodity_type, invest_date, modal_amount wajib');
    }
    if (!['gold', 'wood'].includes(commodity_type)) {
      return badRequest('commodity_type harus gold atau wood');
    }

    const prefix = commodity_type === 'gold' ? 'INV-GOLD' : 'INV-WOOD';
    const year   = new Date().getFullYear();
    const rand   = Math.random().toString(36).slice(2, 8).toUpperCase();
    const investment_code = `${prefix}-${year}-${rand}`;

    await query(
      `INSERT INTO commodity_investments
         (investment_code, commodity_type, project_code, invest_date, modal_amount, total_return,
          bank_account_code, notes, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'active', ?, NOW(), NOW())`,
      [investment_code, commodity_type, project_code || null, invest_date, modal_amount,
       bank_account_code || null, notes || null, user.user_code],
    );

    // Journal entry — skip gracefully if rule not configured
    let journal_code: string | null = null;
    if (bank_account_code) {
      const commodity = COMMODITY_LABEL[commodity_type as 'gold' | 'wood'];
      journal_code = await createCommodityJournal({
        transaction_type: 'invest_create',
        investment_code,
        transaction_date: invest_date,
        amount: Number(modal_amount),
        description: `Modal investasi ${commodity} ${investment_code}`,
        bank_account_code,
      }, user);
      if (journal_code) {
        await query(`UPDATE commodity_investments SET journal_code=? WHERE investment_code=?`, [journal_code, investment_code]);
      }
    }

    return created({ investment_code, journal_code });
  } catch (err) { return serverError(err); }
});
