/**
 * 数据库迁移 API
 * 执行 SQL 迁移脚本
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

    const body = await request.json();
    const { migrationName } = body;

    console.log(`[数据库迁移] 开始执行迁移: ${migrationName}`);

    const db = await getDb();

    // 根据迁移名称执行不同的迁移
    if (migrationName === 'remove_word_unique_constraint') {
      // 移除 words 表的 UNIQUE 约束
      await db.execute(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = 'words'::regclass
                AND conname = 'words_word_unique'
            ) THEN
                ALTER TABLE words DROP CONSTRAINT words_word_unique;
                RAISE NOTICE '已删除约束 words_word_unique';
            ELSE
                RAISE NOTICE '约束 words_word_unique 不存在，跳过删除';
            END IF;
        END $$;
      `);

      console.log(`[数据库迁移] 迁移 remove_word_unique_constraint 执行成功`);

      return NextResponse.json({
        success: true,
        message: '迁移 remove_word_unique_constraint 执行成功',
        migrationName,
      });
    } else {
      return NextResponse.json(
        { error: `未知的迁移: ${migrationName}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[数据库迁移] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '数据库迁移失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
