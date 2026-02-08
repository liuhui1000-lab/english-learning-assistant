import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/db';
import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { grammarExercises, grammarPracticeRecords, grammarWeakPoints } from '@/storage/database/shared/schema';
import { eq, sql, desc, and } from 'drizzle-orm';

// 获取练习题列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');  // 新增：题型筛选
    const limit = parseInt(searchParams.get('limit') || '10');
    const userId = searchParams.get('userId') || 'demo_user';

    const db = await getDb();

    // 构建查询条件
    const conditions: any[] = [];
    if (category) {
      conditions.push(eq(grammarExercises.category, category));
    }
    if (type) {
      conditions.push(eq(grammarExercises.type, type));
    }

    // 获取总体题库数量
    const totalCountQuery = db.select({ count: sql<number>`count(*)` })
      .from(grammarExercises)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const [{ count: totalCount }] = await totalCountQuery;

    // 获取用户的总体练习记录
    const userConditions: any[] = [];
    if (category) {
      const exerciseIds = db.select({ id: grammarExercises.id }).from(grammarExercises).where(eq(grammarExercises.category, category));
      userConditions.push(sql`${grammarPracticeRecords.exerciseId} IN (${exerciseIds})`);
    }
    const userRecordsQuery = db.select().from(grammarPracticeRecords)
      .where(userConditions.length > 0 ? and(...userConditions) : undefined);
    const userRecords = await userRecordsQuery;

    // 计算总体统计数据
    const totalAttempted = new Set(userRecords.map(r => r.exerciseId)).size;
    const totalCorrect = userRecords.filter(r => r.isCorrect).length;
    const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    // 获取练习题列表
    const query = db.select().from(grammarExercises)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const exercises = await query.limit(limit).orderBy(sql`RANDOM()`);

    return NextResponse.json({
      success: true,
      data: exercises,
      meta: {
        totalCount,          // 总题数
        totalAttempted,      // 已做题数（去重）
        totalCorrect,        // 做对的题数
        overallAccuracy      // 总体正确率
      }
    });

  } catch (error) {
    console.error('获取练习题失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// 使用AI判断答案
async function evaluateAnswerWithAI(
  question: string,
  userAnswer: string,
  correctAnswer: string,
  exerciseType: string
): Promise<{ isCorrect: boolean; explanation?: string } | null> {
  try {
    const config = new Config();
    const client = new LLMClient(config);

    const systemPrompt = `你是一位上海中考英语语法专家。请判断学生的答案是否正确。

判断标准：
1. 选择题：选择必须完全正确
2. 句型转换题：保持原句意思，语法正确即可，接受多种转换方式
3. 填空题：答案在语法和语境上正确即可

请以JSON格式返回：
{
  "is_correct": true/false,
  "explanation": "简短说明为什么对或错（50字以内）"
}

只返回JSON，不要其他文字。`;

    const userPrompt = `题目：${question}
正确参考答案：${correctAnswer}
学生答案：${userAnswer}
题型：${exerciseType}

请判断学生的答案是否正确。`;

    const response = await client.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      model: 'doubao-seed-1-6-251015',
      temperature: 0.1
    });

    let jsonContent = response.content;
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    const result = JSON.parse(jsonContent);
    return {
      isCorrect: result.is_correct || false,
      explanation: result.explanation
    };

  } catch (error) {
    console.error('AI评估失败，使用传统方法:', error);
    // AI失败时回退到传统方法
    return null;
  }
}

// 传统方法判断答案
function evaluateAnswerTraditional(
  userAnswer: string,
  correctAnswer: string,
  options: string[] | null
): { isCorrect: boolean; displayCorrectAnswer: string } {
  let isCorrect = false;
  let displayCorrectAnswer = correctAnswer;

  if (options && Array.isArray(options) && options.length > 0) {
    // 选择题
    const correctOption = options.find(opt =>
      opt.startsWith(correctAnswer + ')') || opt.startsWith(correctAnswer + '.')
    );

    if (correctOption) {
      const correctContent = correctOption.replace(/^[A-D][).]\s*/, '').trim().toLowerCase();
      isCorrect = userAnswer.trim().toLowerCase() === correctContent;

      if (!isCorrect) {
        isCorrect = userAnswer.trim().toUpperCase() === correctAnswer.trim().toUpperCase();
      }

      displayCorrectAnswer = `${correctAnswer}) ${correctContent}`;
    }
  } else {
    // 填空题：直接比较（忽略大小写、标点）
    const cleanUser = userAnswer.trim().toLowerCase().replace(/[.,!?;:'"]/g, '');
    const cleanCorrect = correctAnswer.trim().toLowerCase().replace(/[.,!?;:'"]/g, '');
    isCorrect = cleanUser === cleanCorrect;
    displayCorrectAnswer = correctAnswer;
  }

  return { isCorrect, displayCorrectAnswer };
}

// 提交答案
export async function POST(request: NextRequest) {
  try {
    const { exerciseId, userAnswer, userId } = await request.json();

    if (!exerciseId || !userAnswer || !userId) {
      return NextResponse.json(
        { error: '缺少必需的参数' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 获取练习题
    const [exercise] = await db.select()
      .from(grammarExercises)
      .where(eq(grammarExercises.id, exerciseId));

    if (!exercise) {
      return NextResponse.json(
        { error: '练习题不存在' },
        { status: 404 }
      );
    }

    let isCorrect = false;
    let aiExplanation = '';
    let displayCorrectAnswer = exercise.correctAnswer;

    // 判断题型
    const needsAI = exercise.type === '句型转换题' ||
                     exercise.type === '词转题' ||
                     exercise.type === '句法';

    if (needsAI) {
      // 需要AI评估的题型（句型转换、词转等）
      console.log(`使用AI评估答案，题型：${exercise.type}`);
      const aiResult = await evaluateAnswerWithAI(
        exercise.question || '',
        userAnswer,
        exercise.correctAnswer,
        exercise.type
      );

      if (aiResult) {
        isCorrect = aiResult.isCorrect;
        aiExplanation = aiResult.explanation || '';
        displayCorrectAnswer = exercise.correctAnswer;
      } else {
        // AI失败，使用传统方法
        const traditionalResult = evaluateAnswerTraditional(
          userAnswer,
          exercise.correctAnswer,
          exercise.options as string[] | null
        );
        isCorrect = traditionalResult.isCorrect;
        displayCorrectAnswer = traditionalResult.displayCorrectAnswer;
      }
    } else {
      // 选择题和简单填空题，使用传统方法
      const traditionalResult = evaluateAnswerTraditional(
        userAnswer,
        exercise.correctAnswer,
        exercise.options as string[] | null
      );
      isCorrect = traditionalResult.isCorrect;
      displayCorrectAnswer = traditionalResult.displayCorrectAnswer;
    }

    // 记录练习记录
    const [record] = await db.insert(grammarPracticeRecords)
      .values({
        userId,
        exerciseId,
        userAnswer,
        isCorrect,
        timeSpent: 0
      })
      .returning();

    // 如果错误，更新薄弱知识点
    if (!isCorrect && exercise.category && exercise.subcategory) {
      const [existing] = await db.select()
        .from(grammarWeakPoints)
        .where(
          and(
            eq(grammarWeakPoints.userId, userId),
            eq(grammarWeakPoints.category, exercise.category),
            eq(grammarWeakPoints.subcategory, exercise.subcategory)
          )
        );

      if (existing) {
        await db.update(grammarWeakPoints)
          .set({
            errorCount: (existing.errorCount || 0) + 1,
            practiceCount: (existing.practiceCount || 0) + 1,
            accuracy: Math.floor(((existing.practiceCount || 0) / ((existing.practiceCount || 0) + 1)) * 100),
            weakLevel: Math.min(5, (existing.weakLevel || 0) + 1),
          })
          .where(eq(grammarWeakPoints.id, existing.id));
      } else {
        await db.insert(grammarWeakPoints)
          .values({
            userId,
            grammarPointId: exercise.grammarPointId || '',
            category: exercise.category,
            subcategory: exercise.subcategory,
            errorCount: 1,
            practiceCount: 1,
            accuracy: 0,
            weakLevel: 1,
          });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        isCorrect,
        correctAnswer: displayCorrectAnswer,
        explanation: aiExplanation || exercise.explanation,
        category: exercise.category,
        subcategory: exercise.subcategory,
        recordId: record.id,
        usedAI: needsAI
      }
    });

  } catch (error) {
    console.error('提交答案失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
