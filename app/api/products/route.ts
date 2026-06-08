// app/api/products/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') ?? '';
    const category = url.searchParams.get('category') ?? '';

    const conditions = ['p.is_deleted = 0'];
    const params: unknown[] = [];
    
    if (search) { 
      conditions.push('(p.product_name LIKE ? OR p.product_code LIKE ?)'); 
      params.push(`%${search}%`, `%${search}%`); 
    }
    if (category) { 
      conditions.push('p.category = ?');  // ← ganti dari category_code ke category
      params.push(category); 
    }

    const where = conditions.join(' AND ');
    const [rows, count] = await Promise.all([
      query(`SELECT p.*, pc.name AS category_name 
              FROM products p 
              LEFT JOIN product_categories pc ON pc.name = p.category  -- ← JOIN pakai name = category
              WHERE ${where} 
              ORDER BY p.product_name ASC 
              LIMIT ? OFFSET ?`, 
             [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM products p WHERE ${where}`, params),
    ]);
    
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { 
    return serverError(err); 
  }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { product_name, description, category, unit_type, unit_price, cost_price } = await req.json();
    
    if (!product_name?.trim()) return badRequest('Nama produk wajib diisi');
    
    const product_code = `PRD${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    
    await query(`INSERT INTO products 
                 (product_code, product_name, description, category, unit_type, unit_price, cost_price, is_deleted, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [product_code, product_name, description ?? null, category ?? null, unit_type ?? 'pcs', unit_price ?? 0, cost_price ?? 0]);
    
    return created({ product_code });
  } catch (err) { 
    return serverError(err); 
  }
});