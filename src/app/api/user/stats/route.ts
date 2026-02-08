/**
 * 用户统计API
 * 获取用户的学习统计数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { getDb } from '@/utils/db';
import { userWordProgress, grammarMistakes, transformationMistakes } from '@/storage/database/shared/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const db = await getDb();

    // 统计单词进度
    const vocabularyResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(userWordProgress)
      .where(eq(userWordProgress.userId, currentUser.userId));

    const vocabularyCount = vocabularyResult[0]?.count || 0;

    // 统计语法错题
    const grammarResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(grammarMistakes)
      .where(eq(grammarMistakes.userId, currentUser.userId));

    const grammarCount = grammarResult[0]?.count || 0;

    // 统计词转错题
    const transformationResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(transformationMistakes)
      .where(eq(transformationMistakes.userId, currentUser.userId));

    const transformationCount = transformationResult[0]?.count || 0;

    // 统计总错题数
    const totalMistakes = grammarCount + transformationCount;

    // 统计阅读文章（简化处理，返回0）
    const readingCount = 0;

    return NextResponse.json({
      success: true,
      data: {
        vocabulary: vocabularyCount,
        grammar: grammarCount,
        reading: readingCount,
        mistakes: totalMistakes,
      },
    });
  } catch (error) {
    console.error('[用户统计] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取统计数据失败',
      },
      { status: 500 }
    );
  }
}
