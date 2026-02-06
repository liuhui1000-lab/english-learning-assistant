import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { userWordProgress } from '@/storage/database/shared/schema';
import { eq, and, sql } from 'drizzle-orm';

interface TestResult {
  wordId: string;
  meaningCorrect: boolean; // 词义选择题是否正确
  spellingCorrect: boolean; // 拼写是否正确
  skipped?: boolean; // 是否跳过
}

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

// 提交学习结果
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = 'default-user', results }: { userId: string; results: TestResult[] } = body;

    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { success: false, error: '参数错误' },
        { status: 400 }
      );
    }

    const updatedProgress = [];

    for (const result of results) {
      const { wordId, meaningCorrect, spellingCorrect, skipped = false } = result;

      // 获取当前进度
      const db = await getDb();
      const [currentProgress] = await db
        .select()
        .from(userWordProgress)
        .where(
          and(
            eq(userWordProgress.wordId, wordId),
            eq(userWordProgress.userId, userId)
          )
        )
        .limit(1);

      let masteryLevel = currentProgress?.masteryLevel || 0;
      let errorCount = currentProgress?.errorCount || 0;
      let consecutiveCorrect = currentProgress?.consecutiveCorrect || 0;
      let reviewCount = currentProgress?.reviewCount || 0;
      let learningSessions = currentProgress?.learningSessions || 0;

      if (skipped) {
        // 跳过：不影响掌握度
        continue;
      }

      // 更新掌握度（基于词义和拼写测试结果）
      if (meaningCorrect && spellingCorrect) {
        // 两个都正确：掌握度 +10，连续正确 +1
        masteryLevel = Math.min(100, masteryLevel + 10);
        consecutiveCorrect++;
        // 连续正确3次以上，额外奖励
        if (consecutiveCorrect >= 3) {
          masteryLevel = Math.min(100, masteryLevel + 5);
        }
      } else if (meaningCorrect || spellingCorrect) {
        // 只有一个正确：掌握度 +5
        masteryLevel = Math.min(100, masteryLevel + 5);
        consecutiveCorrect = 0;
      } else {
        // 都不正确：掌握度 -15，错误次数 +1
        masteryLevel = Math.max(0, masteryLevel - 15);
        errorCount++;
        consecutiveCorrect = 0;
      }

      // 更新复习次数和学习会话
      reviewCount++;
      learningSessions++;

      // 计算下次复习时间
      const nextReviewAt = calculateNextReview(masteryLevel, errorCount);
      const now = new Date();

      // 保存进度
      const updateData = {
        userId,
        wordId,
        masteryLevel,
        reviewCount,
        errorCount,
        consecutiveCorrect,
        learningSessions,
      };

      if (currentProgress) {
        await db
          .update(userWordProgress)
          .set(updateData)
          .where(
            and(
              eq(userWordProgress.wordId, wordId),
              eq(userWordProgress.userId, userId)
            )
          );
      } else {
        await db.insert(userWordProgress).values(updateData);
      }

      updatedProgress.push({
        wordId,
        masteryLevel,
        errorCount,
        nextReviewAt,
      });
    }

    return NextResponse.json({
      success: true,
      updatedProgress,
    });
  } catch (error) {
    console.error('Error submitting results:', error);
    return NextResponse.json(
      { success: false, error: '提交失败' },
      { status: 500 }
    );
  }
}
