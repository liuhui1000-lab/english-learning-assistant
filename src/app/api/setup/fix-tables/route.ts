/**
 * 修复数据库表结构
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function POST(request: NextRequest) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('开始修复数据库表结构...');

    // 修改 user_login_logs 表的 ip_address 字段为 text 类型
    await pool.query(`
      ALTER TABLE user_login_logs 
      ALTER COLUMN ip_address TYPE text
    `);

    console.log('✓ user_login_logs.ip_address 已修改为 text 类型');

    // 检查管理员账户是否存在，不存在则创建
    const existingUsers = await pool.query(
      'SELECT username FROM users WHERE username = $1',
      ['admin']
    );

    if (existingUsers.rows.length === 0) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await pool.query(`
        INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [crypto.randomUUID(), 'admin', 'admin@example.com', hashedPassword, 'admin', true]);

      console.log('✓ 管理员账户已创建');
    } else {
      console.log('✓ 管理员账户已存在');
    }

    return NextResponse.json({
      success: true,
      message: '数据库表结构修复成功',
    });
  } catch (error) {
    console.error('修复失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '修复失败',
      },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}
