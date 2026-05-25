// app/lib/db.ts — MPG Finance v2
// FIXED: Handle LIMIT/OFFSET parameters correctly for all APIs
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host:             process.env.DB_HOST,
  user:             process.env.DB_USER,
  password:         process.env.DB_PASSWORD,
  database:         process.env.DB_NAME,
  port:             parseInt(process.env.DB_PORT ?? '3306'),
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0,
  connectTimeout:   30000,
  // Optional: Fix type casting for TINYINT(1) to boolean
  typeCast: function (field: any, next: any) {
    if (field.type === 'TINY' && field.length === 1) {
      return (field.string() === '1');
    }
    return next();
  },
});

export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  // FIX: Convert all number parameters to string to fix ER_WRONG_ARGUMENTS error
  // This is needed because some MySQL/mysql2 versions have issues with LIMIT ? OFFSET ?
  const fixedParams = params.map(p => {
    // Convert numbers to strings to avoid the error
    if (typeof p === 'number') {
      return String(p);
    }
    // Handle null/undefined
    if (p === null || p === undefined) {
      return null;
    }
    return p;
  });
  
  try {
    const [rows] = await pool.execute(sql, fixedParams);
    return rows as T[];
  } catch (error) {
    console.error('Database Query Error:', {
      sql: sql.replace(/\s+/g, ' ').trim(),
      params: fixedParams,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

export async function queryOne<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function transaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export { pool };