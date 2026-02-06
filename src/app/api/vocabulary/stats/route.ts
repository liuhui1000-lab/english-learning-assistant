import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { userWordProgress, words } from '@/storage/database/shared/schema';
import { eq, and, sql, lt } from 'drizzle-orm';

// 获取用户学习统计
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default-user';

    // 获取学习统计
    const stats = await db
      .select({
        totalWords: sql<number>`COUNT(DISTINCT ${userWordProgress.wordId})`.mapWith(Number),
        totalReview: sql<number>`SUM(${userWordProgress.reviewCount})`.mapWith(Number),
        totalErrors: sql<number>`SUM(${userWordProgress.errorCount})`.mapWith(Number),
        avgMastery: sql<number>`AVG(${userWordProgress.masteryLevel})`.mapWith(Number),
      })
      .from(userWordProgress)
      .where(eq(userWordProgress.userId, userId));

    // 获取需要复习的单词数量
    const [needReview] = await db
      .select({
        count: sql<number>`COUNT(*)`.mapWith(Number),
      })
      .from(userWordProgress)
      .where(
        and(
          eq(userWordProgress.userId, userId),
          sql`${userWordProgress.nextReviewAt} <= NOW()`
        )
      );

    // 获取掌握度分布
    const masteryDistribution = await db
      .select({
        level: userWordProgress.masteryLevel,
        count: sql<number>`COUNT(*)`.mapWith(Number),
      })
      .from(userWordProgress)
      .where(eq(userWordProgress.userId, userId))
      .groupBy(userWordProgress.masteryLevel);

    // 获取最近学习的单词
    const recentWords = await db
      .select({
        word: words,
        progress: userWordProgress,
      })
      .from(userWordProgress)
      .leftJoin(words, eq(userWordProgress.wordId, words.id))
      .where(eq(userWordProgress.userId, userId))
      .orderBy(sql`${userWordProgress.lastReviewAt} DESC`)
      .limit(10);

    return NextResponse.json({
      success: true,
      stats: stats[0],
      needReview: needReview.count,
      masteryDistribution,
      recentWords: recentWords.map(r => r.word),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: '获取统计失败' },
      { status: 500 }
    );
  }
}
