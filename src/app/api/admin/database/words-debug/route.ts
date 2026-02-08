/**
 * 调试单词表数据
 * 查看当前数据库中的单词数量和内容
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/db';
import { checkPermission } from '@/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const db = await getDb();

    // 查询单词总数
    const countResult = await db.execute('SELECT COUNT(*) as count FROM words');
    const totalCount = countResult.rows[0].count;

    // 查询前 10 个单词
    const wordsResult = await db.execute('SELECT id, word, phonetic, meaning FROM words LIMIT 10');

    // 查询一些具体的单词（用于测试）
    const testWords = ['after', 'age', 'always', 'australia', 'canada', 'usa', 'china'];
    const testQuery = await db.execute(
      `SELECT word, phonetic, meaning FROM words WHERE LOWER(word) = ANY(('${testWords.map(w => w.toLowerCase()).join("','")}'))`
    );

    console.log('[单词调试] 总数:', totalCount);
    console.log('[单词调试] 前10个单词:', wordsResult.rows);
    console.log('[单词调试] 测试查询结果:', testQuery.rows);

    return NextResponse.json({
      success: true,
      data: {
        totalCount,
        first10Words: wordsResult.rows,
        testWordsQuery: testQuery.rows,
      },
    });
  } catch (error) {
    console.error('[单词调试] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '查询失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
