import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { userTransformationProgress, wordTransformations } from '@/storage/database/shared/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { calculateNextReview, calculateMasteryLevel } from '@/utils/ebbinghaus';

/**
 * 提交词转练习答案
 * 自动记录学习进度，根据艾宾浩斯记忆曲线安排复习
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, transformationId, word, isCorrect, userAnswer } = await request.json();

    if (!userId || !transformationId || isCorrect === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 查询当前进度
    const existingProgress = await db
      .select()
      .from(userTransformationProgress)
      .where(
        and(
          eq(userTransformationProgress.userId, userId),
          eq(userTransformationProgress.transformationId, transformationId)
        )
      )
      .limit(1);

    const now = new Date();

    if (existingProgress.length > 0) {
      // 更新现有进度
      const progress = existingProgress[0];
      let newReviewCount = progress.reviewCount || 0;
      let newCorrectCount = progress.correctCount || 0;
      let newWrongCount = progress.wrongCount || 0;
      let nextReviewAt = progress.nextReviewAt;
      let masteryLevel = progress.masteryLevel || 0;

      if (isCorrect) {
        newCorrectCount += 1;
        // 连续正确时，计算下次复习时间
        const lastReviewDate = progress.lastReviewAt ? new Date(progress.lastReviewAt) : now;
        const schedule = calculateNextReview(newReviewCount, lastReviewDate);
        nextReviewAt = schedule.nextReviewAt?.toISOString() || null;
        newReviewCount += 1;

        // 计算掌握等级
        masteryLevel = calculateMasteryLevel(
          newCorrectCount - (progress.correctCount || 0), // 本次连续正确次数（简化处理）
          newReviewCount
        );
      } else {
        newWrongCount += 1;
        // 答错时重置复习进度
        newReviewCount = 0;
        newCorrectCount = 0;
        nextReviewAt = new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString(); // 1小时后重试
        masteryLevel = 0;
      }

      await db
        .update(userTransformationProgress)
        .set({
          reviewCount: newReviewCount,
          correctCount: newCorrectCount,
          wrongCount: newWrongCount,
          masteryLevel,
          nextReviewAt,
        })
        .where(eq(userTransformationProgress.id, progress.id));
    } else {
      // 创建新的进度记录
      let nextReviewAt: string;
      let masteryLevel: number;
      let reviewCount = 0;

      if (isCorrect) {
        const schedule = calculateNextReview(reviewCount, now);
        nextReviewAt = schedule.nextReviewAt.toISOString();
        reviewCount = schedule.reviewCount;
        masteryLevel = 1;
      } else {
        nextReviewAt = new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString(); // 1小时后重试
        masteryLevel = 0;
      }

      await db.insert(userTransformationProgress).values({
        userId,
        transformationId,
        word,
        masteryLevel,
        reviewCount,
        correctCount: isCorrect ? 1 : 0,
        wrongCount: isCorrect ? 0 : 1,
        nextReviewAt,
      });
    }

    return NextResponse.json({
      success: true,
      message: isCorrect ? '回答正确！' : '已记录错题，请稍后复习',
    });
  } catch (error) {
    console.error('记录学习进度失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

/**
 * 获取需要复习的词转题目
 * 根据艾宾浩斯记忆曲线获取应该复习的题目
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo_user';
    const limit = parseInt(searchParams.get('limit') || '10');

    const db = await getDb();

    const now = new Date();

    // 获取需要复习的题目（nextReviewAt <= 当前时间）
    const reviewTasks = await db
      .select({
        id: userTransformationProgress.id,
        transformationId: userTransformationProgress.transformationId,
        word: userTransformationProgress.word,
        masteryLevel: userTransformationProgress.masteryLevel,
        reviewCount: userTransformationProgress.reviewCount,
        correctCount: userTransformationProgress.correctCount,
        wrongCount: userTransformationProgress.wrongCount,
        nextReviewAt: userTransformationProgress.nextReviewAt,
      })
      .from(userTransformationProgress)
      .where(
        and(
          eq(userTransformationProgress.userId, userId),
          // 下次复习时间小于等于当前时间，或者为null
          or(
            sql`${userTransformationProgress.nextReviewAt} <= ${now}`,
            sql`${userTransformationProgress.nextReviewAt} IS NULL`
          )
        )
      )
      .orderBy(userTransformationProgress.nextReviewAt)
      .limit(limit);

    // 获取题目的详细信息
    const transformationIds = reviewTasks.map(t => t.transformationId);
    const transformations = await db
      .select()
      .from(wordTransformations)
      .where(sql`id = ANY(${transformationIds})`);

    // 合并数据
    const reviewItems = reviewTasks.map(task => {
      const transformation = transformations.find(t => t.id === task.transformationId);
      return {
        ...task,
        transformations: transformation?.transformations || [],
        baseMeaning: transformation?.baseMeaning || '',
      };
    });

    return NextResponse.json({
      success: true,
      data: reviewItems,
      meta: {
        total: reviewItems.length,
        needsReview: reviewItems.length,
      },
    });
  } catch (error) {
    console.error('获取复习任务失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
