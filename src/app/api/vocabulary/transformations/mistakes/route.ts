import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/db';
import { transformationMistakes, wordTransformations } from '@/storage/database/shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// 记录词转错题
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const {
      userId = 'default-user',
      transformationId,
      word,
      type,
      sentence,
      wrongAnswer,
      correctAnswer,
      mistakeType,
      explanation,
    } = body;

    if (!transformationId || !word || !type || !sentence || !correctAnswer) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 检查是否已有相同的错题记录
    const [existingMistake] = await db
      .select()
      .from(transformationMistakes)
      .where(
        and(
          eq(transformationMistakes.userId, userId),
          eq(transformationMistakes.transformationId, transformationId),
          eq(transformationMistakes.word, word)
        )
      )
      .limit(1);

    if (existingMistake) {
      // 更新已有记录
      const [updated] = await db
        .update(transformationMistakes)
        .set({
          wrongAnswer,
          mistakeType,
          explanation,
          errorCount: sql`${transformationMistakes.errorCount} + 1`,
        })
        .where(eq(transformationMistakes.id, existingMistake.id))
        .returning();

      return NextResponse.json({
        success: true,
        mistake: updated,
      });
    } else {
      // 创建新记录
      const [newMistake] = await db
        .insert(transformationMistakes)
        .values({
          userId,
          transformationId,
          word,
          type,
          sentence,
          wrongAnswer,
          correctAnswer,
          mistakeType,
          explanation,
        })
        .returning();

      return NextResponse.json({
        success: true,
        mistake: newMistake,
      });
    }
  } catch (error) {
    console.error('Error recording transformation mistake:', error);
    return NextResponse.json(
      { success: false, error: '记录失败' },
      { status: 500 }
    );
  }
}

// 获取错题列表
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default-user';
    const mastered = searchParams.get('mastered') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const mistakes = await db
      .select({
        mistake: transformationMistakes,
        transformation: wordTransformations,
      })
      .from(transformationMistakes)
      .leftJoin(
        wordTransformations,
        eq(transformationMistakes.transformationId, wordTransformations.id)
      )
      .where(
        and(
          eq(transformationMistakes.userId, userId),
          mastered ? eq(transformationMistakes.mastered, true) : undefined
        )
      )
      .orderBy(sql`${transformationMistakes.errorCount} DESC, ${transformationMistakes.createdAt} DESC`)
      .limit(limit);

    return NextResponse.json({
      success: true,
      mistakes: mistakes.map(m => ({
        ...m.mistake,
        transformation: m.transformation,
      })),
    });
  } catch (error) {
    console.error('Error fetching transformation mistakes:', error);
    return NextResponse.json(
      { success: false, error: '获取失败' },
      { status: 500 }
    );
  }
}
