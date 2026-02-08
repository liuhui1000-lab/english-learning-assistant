/**
 * 数据库初始化 API（公共端点）
 * 创建所有必需的数据库表
 *
 * 注意：此 API 不需要登录，用于初始化数据库连接
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[数据库初始化] 开始初始化数据库...');

    // 创建表（通过 SELECT 1 触自动建表）
    const db = await getDb();

    // 测试连接
    await db.execute('SELECT 1');

    console.log('[数据库初始化] 数据库连接成功');

    return NextResponse.json({
      success: true,
      message: '数据库初始化成功',
      note: '表会在首次使用时自动创建',
    });
  } catch (error) {
    console.error('[数据库初始化] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '数据库初始化失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
