import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { transformationMistakes, grammarMistakes, grammarPoints } from '@/storage/database/shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

// 获取错题分析和薄弱知识点
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default-user';
    const type = searchParams.get('type') || 'all'; // transformation, grammar, all

    const result: any = {
      transformation: null,
      grammar: null,
      summary: null,
    };

    // 1. 分析词转错题
    if (type === 'all' || type === 'transformation') {
      // 按变形类型统计错误次数
      const [transformationStats] = await db
        .select({
          totalMistakes: sql<number>`COUNT(*)`.mapWith(Number),
          uniqueWords: sql<number>`COUNT(DISTINCT ${transformationMistakes.word})`.mapWith(Number),
          masteredCount: sql<number>`COUNT(*) FILTER (WHERE ${transformationMistakes.mastered} = true)`.mapWith(Number),
        })
        .from(transformationMistakes)
        .where(eq(transformationMistakes.userId, userId));

      // 获取薄弱的变形类型（按错误次数排序）
      const weakTypes = await db
        .select({
          type: transformationMistakes.type,
          count: sql<number>`COUNT(*)`.mapWith(Number),
          errorCount: sql<number>`SUM(${transformationMistakes.errorCount})`.mapWith(Number),
          masteredCount: sql<number>`COUNT(*) FILTER (WHERE ${transformationMistakes.mastered} = true)`.mapWith(Number),
        })
        .from(transformationMistakes)
        .where(eq(transformationMistakes.userId, userId))
        .groupBy(transformationMistakes.type)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10);

      // 获取高频错题
      const frequentMistakes = await db
        .select()
        .from(transformationMistakes)
        .where(
          and(
            eq(transformationMistakes.userId, userId),
            eq(transformationMistakes.mastered, false)
          )
        )
        .orderBy(desc(transformationMistakes.errorCount))
        .limit(10);

      result.transformation = {
        totalMistakes: transformationStats.totalMistakes,
        uniqueWords: transformationStats.uniqueWords,
        masteredCount: transformationStats.masteredCount,
        weakTypes,
        frequentMistakes,
      };
    }

    // 2. 分析语法错题
    if (type === 'all' || type === 'grammar') {
      // 按语法知识点统计错误次数
      const [grammarStats] = await db
        .select({
          totalMistakes: sql<number>`COUNT(*)`.mapWith(Number),
          uniquePoints: sql<number>`COUNT(DISTINCT ${grammarMistakes.grammarPointId})`.mapWith(Number),
          masteredCount: sql<number>`COUNT(*) FILTER (WHERE ${grammarMistakes.mastered} = true)`.mapWith(Number),
        })
        .from(grammarMistakes)
        .where(eq(grammarMistakes.userId, userId));

      // 获取薄弱的语法知识点
      const weakPoints = await db
        .select({
          pointId: grammarMistakes.grammarPointId,
          pointName: grammarPoints.name,
          category: grammarPoints.category,
          count: sql<number>`COUNT(*)`.mapWith(Number),
          masteredCount: sql<number>`COUNT(*) FILTER (WHERE ${grammarMistakes.mastered} = true)`.mapWith(Number),
        })
        .from(grammarMistakes)
        .leftJoin(grammarPoints, eq(grammarMistakes.grammarPointId, grammarPoints.id))
        .where(eq(grammarMistakes.userId, userId))
        .groupBy(grammarMistakes.grammarPointId, grammarPoints.name, grammarPoints.category)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10);

      // 获取高频语法错题
      const frequentGrammarMistakes = await db
        .select({
          mistake: grammarMistakes,
          point: grammarPoints,
        })
        .from(grammarMistakes)
        .leftJoin(grammarPoints, eq(grammarMistakes.grammarPointId, grammarPoints.id))
        .where(
          and(
            eq(grammarMistakes.userId, userId),
            eq(grammarMistakes.mastered, false)
          )
        )
        .orderBy(desc(grammarMistakes.createdAt))
        .limit(10);

      result.grammar = {
        totalMistakes: grammarStats.totalMistakes,
        uniquePoints: grammarStats.uniquePoints,
        masteredCount: grammarStats.masteredCount,
        weakPoints,
        frequentMistakes: frequentGrammarMistakes.map(f => ({
          ...f.mistake,
          grammarPoint: f.point,
        })),
      };
    }

    // 3. 生成总结
    if (type === 'all') {
      const totalMistakes =
        (result.transformation?.totalMistakes || 0) +
        (result.grammar?.totalMistakes || 0);

      const totalMastered =
        (result.transformation?.masteredCount || 0) +
        (result.grammar?.masteredCount || 0);

      result.summary = {
        totalMistakes,
        masteredCount: totalMastered,
        pendingCount: totalMistakes - totalMastered,
        masteryRate: totalMistakes > 0 ? (totalMastered / totalMistakes) * 100 : 0,
      };
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error analyzing mistakes:', error);
    return NextResponse.json(
      { success: false, error: '分析失败' },
      { status: 500 }
    );
  }
}
