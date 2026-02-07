/**
 * 调试API - 查看数据库中的所有用户
 * 用于排查用户列表显示问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function GET() {
  try {
    // 直接查询所有用户
    const result = await query(`
      SELECT
        id,
        username,
        email,
        full_name,
        role,
        is_active,
        last_login_at,
        created_at,
        updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      users: result.rows,
    });
  } catch (error) {
    console.error('查询用户失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
