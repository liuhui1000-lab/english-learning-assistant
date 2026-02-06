/**
 * 数据库连接工具
 * 使用 Drizzle ORM + node-postgres
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, QueryResult } from 'pg';

// 创建 PostgreSQL 连接池
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * 获取数据库连接实例
 */
export function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // 最大连接数
      idleTimeoutMillis: 30000, // 30秒空闲超时
      connectionTimeoutMillis: 2000, // 2秒连接超时
    });

    // 连接错误处理
    pool.on('error', (err) => {
      console.error('数据库连接池错误:', err);
    });
  }

  if (!db) {
    db = drizzle(pool);
  }

  return db;
}

/**
 * 关闭数据库连接
 */
export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

/**
 * 执行原生SQL查询（用于复杂查询）
 */
export async function query<T = any>(text: string, params?: any[]): Promise<any> {
  const pool = getDb() as any;
  const client = pool.$client;
  return await client.query(text, params);
}

/**
 * 事务执行
 */
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const pool = getDb() as any;
  const client = pool.$client;
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
