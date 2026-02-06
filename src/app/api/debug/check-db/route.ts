/**
 * 临时 API：检查数据库表结构
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(request: NextRequest) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // 检查 users 表
    const usersResult = await pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    // 检查 user_login_logs 表
    const logsResult = await pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'user_login_logs'
      ORDER BY ordinal_position
    `);

    // 检查现有用户
    const usersData = await pool.query('SELECT username, email, role, is_active FROM users');

    return NextResponse.json({
      success: true,
      data: {
        usersTable: usersResult.rows,
        userLoginLogsTable: logsResult.rows,
        existingUsers: usersData.rows,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '检查失败',
      },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}
