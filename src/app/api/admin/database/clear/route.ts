/**
 * 清空单词表 API
 * 用于清空所有单词数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/db';
import { checkPermission } from '@/utils/auth';

export const dynamic = 'force-dynamic';

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

    console.log('[清空数据库] 开始清空单词表...');

    const db = await getDb();

    // 清空单词表
    await db.execute('DELETE FROM words');

    console.log('[清空数据库] 单词表已清空');

    return NextResponse.json({
      success: true,
      message: '单词表已清空',
    });
  } catch (error) {
    console.error('[清空数据库] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '清空失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
