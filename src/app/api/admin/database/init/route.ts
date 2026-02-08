/**
 * 数据库初始化 API
 * 创建所有必需的数据库表
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/db';
import { checkPermission } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

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
