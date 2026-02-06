import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { grammarPracticeRecords, grammarExercises, grammarWeakPoints } from '@/storage/database/shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// 获取错题本
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo_user';

    const db = await getDb();

    // 获取错误的练习记录
    const mistakeRecords = await db
      .select({
        recordId: grammarPracticeRecords.id,
        question: grammarExercises.question,
        type: grammarExercises.type,
        userAnswer: grammarPracticeRecords.userAnswer,
        correctAnswer: grammarExercises.correctAnswer,
        explanation: grammarExercises.explanation,
        category: grammarExercises.category,
        subcategory: grammarExercises.subcategory,
        source: grammarExercises.source,
        questionNumber: grammarExercises.questionNumber,
        createdAt: grammarPracticeRecords.createdAt
      })
      .from(grammarPracticeRecords)
      .innerJoin(
        grammarExercises,
        eq(grammarPracticeRecords.exerciseId, grammarExercises.id)
      )
      .where(
        and(
          eq(grammarPracticeRecords.userId, userId),
          eq(grammarPracticeRecords.isCorrect, false)
        )
      )
      .orderBy(desc(grammarPracticeRecords.createdAt))
      .limit(50);

    // 获取薄弱知识点统计
    const weakPoints = await db
      .select({
        category: grammarWeakPoints.category,
        subcategory: grammarWeakPoints.subcategory,
        errorCount: grammarWeakPoints.errorCount,
        accuracy: grammarWeakPoints.accuracy,
        weakLevel: grammarWeakPoints.weakLevel
      })
      .from(grammarWeakPoints)
      .where(
        and(
          eq(grammarWeakPoints.userId, userId),
          eq(grammarWeakPoints.mastered, false)
        )
      )
      .orderBy(desc(grammarWeakPoints.errorCount))
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        mistakes: mistakeRecords,
        weakPoints: weakPoints,
        totalMistakes: mistakeRecords.length,
        totalWeakPoints: weakPoints.length
      }
    });

  } catch (error) {
    console.error('获取错题本失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
