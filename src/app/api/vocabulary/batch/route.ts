import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { words, userWordProgress } from '@/storage/database/shared/schema';
import { eq, and, or, isNull, asc, sql } from 'drizzle-orm';

// 艾宾浩斯遗忘曲线时间间隔（小时）
const EBBINGHAUS_INTERVALS = [
  1,      // 1小时后复习
  12,     // 12小时后
  24,     // 1天后
  72,     // 3天后
  168,    // 7天后
  336,    // 14天后
  720,    // 30天后
];

// 计算下次复习时间
function calculateNextReview(masteryLevel: number, errorCount: number): Date {
  const now = new Date();

  // 基础间隔：基于掌握程度
  let baseInterval = EBBINGHAUS_INTERVALS[Math.min(masteryLevel, EBBINGHAUS_INTERVALS.length - 1)];

  // 错误惩罚：每增加1次错误，复习间隔减半
  const penalty = Math.pow(0.5, Math.min(errorCount, 5));
  const adjustedInterval = baseInterval * penalty;

  // 最小间隔1小时，最大间隔30天
  const finalInterval = Math.max(1, Math.min(720, adjustedInterval));

  return new Date(now.getTime() + finalInterval * 60 * 60 * 1000);
}

// 获取一批待学习的单词
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default-user';
    const batchSize = parseInt(searchParams.get('batchSize') || '6'); // 默认6个单词

    // 1. 优先获取需要复习的单词（nextReviewAt <= now）
    const reviewWords = await db
      .select({
        word: words,
        progress: userWordProgress,
      })
      .from(userWordProgress)
      .leftJoin(words, eq(userWordProgress.wordId, words.id))
      .where(
        and(
          eq(userWordProgress.userId, userId),
          sql`${userWordProgress.nextReviewAt} <= NOW()`
        )
      )
      .orderBy(asc(userWordProgress.nextReviewAt))
      .limit(batchSize);

    // 如果有需要复习的单词，返回它们
    if (reviewWords.length > 0) {
      return NextResponse.json({
        success: true,
        mode: 'review',
        words: reviewWords.map(r => r.word),
      });
    }

    // 2. 如果没有需要复习的单词，获取未学习的单词
    const newWords = await db
      .select()
      .from(words)
      .leftJoin(
        userWordProgress,
        and(
          eq(userWordProgress.wordId, words.id),
          eq(userWordProgress.userId, userId)
        )
      )
      .where(isNull(userWordProgress.id))
      .orderBy(asc(words.difficulty))
      .limit(batchSize);

    if (newWords.length > 0) {
      return NextResponse.json({
        success: true,
        mode: 'learn',
        words: newWords.map(n => ({
          id: n.words.id,
          word: n.words.word,
          phonetic: n.words.phonetic,
          meaning: n.words.meaning,
          example: n.words.example,
          exampleTranslation: n.words.exampleTranslation,
          difficulty: n.words.difficulty,
          createdAt: n.words.createdAt,
        })),
      });
    }

    // 3. 如果所有单词都学过，随机选择一些进行复习（按错误次数排序，优先复习错误多的）
    const randomReview = await db
      .select({
        word: words,
        progress: userWordProgress,
      })
      .from(userWordProgress)
      .leftJoin(words, eq(userWordProgress.wordId, words.id))
      .where(eq(userWordProgress.userId, userId))
      .orderBy(sql`${userWordProgress.errorCount} DESC`)
      .limit(batchSize);

    return NextResponse.json({
      success: true,
      mode: 'practice',
      words: randomReview.map(r => r.word),
    });
  } catch (error) {
    console.error('Error fetching batch words:', error);
    return NextResponse.json(
      { success: false, error: '获取单词失败' },
      { status: 500 }
    );
  }
}
