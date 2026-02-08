import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/db';
import { words } from '@/storage/database/shared/schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    // 测试连接
    await db.execute('SELECT 1');

    // 查询单词表
    const wordCount = await db.select({ count: words.id }).from(words);
    const sampleWords = await db.select().from(words).limit(5);

    return NextResponse.json({
      success: true,
      database: 'connected',
      wordCount: wordCount.length,
      sampleWords: sampleWords,
      message: `数据库正常，当前有 ${wordCount.length} 个单词`,
    });
  } catch (error) {
    console.error('[数据库测试] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '数据库测试失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
