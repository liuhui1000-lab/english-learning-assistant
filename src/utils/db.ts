/**
 * 数据库连接工具
 * 使用 Drizzle ORM + Neon Serverless
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// 配置 WebSocket 支持以在某些环境中提升性能并规避连接限制
neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * 获取数据库连接实例
 */
export function getDb() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }
    pool = new Pool({
      connectionString,
      max: 1, // Serverless 环境建议连接数为 1
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });

    // 连接错误处理
    pool.on('error', (err) => {
      console.error('数据库连接池错误:', err);
      pool = null;
      db = null;
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
  callback: (tx: any) => Promise<T>
): Promise<T> {
  const db = getDb();
  return await db.transaction(async (tx) => {
    return await callback(tx);
  });
}
