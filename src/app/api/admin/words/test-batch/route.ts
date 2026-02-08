import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/utils/db';
import { checkPermission } from '@/utils/auth';
import { inArray } from 'drizzle-orm';
import { words } from '@/storage/database/shared/schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[测试批量上传] 开始处理请求');

    // 验证权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      console.log('[测试批量上传] 权限检查失败:', permission.error);
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    console.log('[测试批量上传] 权限检查通过，用户:', permission);

    const body = await request.json();
    const testWords = [
      { word: 'test1', definition: '测试1' },
      { word: 'test2', definition: '测试2' },
      { word: 'test3', definition: '测试3' },
    ];

    console.log('[测试批量上传] 测试单词:', testWords);

    const db = await getDb();

    // 查询当前数据库状态
    const countResult = await query('SELECT COUNT(*) as count FROM words');
    console.log('[测试批量上传] 当前单词数:', countResult.rows[0].count);

    // 使用 inArray 查询
    const allWords = testWords.map(w => w.word);
    console.log('[测试批量上传] 查询单词列表:', allWords);

    const existingWordsResult = await db
      .select()
      .from(words)
      .where(inArray(words.word, allWords));

    console.log('[测试批量上传] 查询结果:', existingWordsResult.length, '个已存在');

    // 插入测试单词
    const insertData = testWords.map(w => ({
      word: w.word.toLowerCase(),
      meaning: w.definition,
      difficulty: 1,
    }));

    console.log('[测试批量上传] 准备插入:', insertData);

    const inserted = await db
      .insert(words)
      .values(insertData)
      .returning();

    console.log('[测试批量上传] 插入成功:', inserted.length, '个单词');

    return NextResponse.json({
      success: true,
      message: `测试成功，插入了 ${inserted.length} 个单词`,
      inserted: inserted,
    });
  } catch (error) {
    console.error('[测试批量上传] 错误:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '测试失败',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
