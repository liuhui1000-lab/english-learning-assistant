import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[用户列表] 查询用户列表');

    const result = await query(`
      SELECT id, username, email, full_name, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      users: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('[用户列表] 错误:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '查询失败',
      },
      { status: 500 }
    );
  }
}
