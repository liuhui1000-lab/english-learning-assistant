import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/db';
import { grammarExercises, collocations } from '@/storage/database/shared/schema';
import { eq, sql } from 'drizzle-orm';

// 常见固定搭配映射
const COMMON_COLLOCATIONS: Record<string, string> = {
  'be thankful to': 'be thankful to',
  'be proud of': 'be proud of',
  'be afraid of': 'be afraid of',
  'be interested in': 'be interested in',
  'be good at': 'be good at',
  'be famous for': 'be famous for',
  'be responsible for': 'be responsible for',
  'be strict with': 'be strict with',
  'be used to': 'be used to',
  'look forward to': 'look forward to',
  'give up': 'give up',
  'look after': 'look after',
  'look for': 'look for',
  'get on with': 'get on with',
  'get along with': 'get along with',
  'take part in': 'take part in',
  'take care of': 'take care of',
  'worry about': 'worry about',
  'depend on': 'depend on',
  'do harm to': 'do harm to',
  'for the time being': 'for the time being',
};

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    // 获取所有固定搭配相关的练习题
    const exercises = await db
      .select()
      .from(grammarExercises)
      .where(
        sql`category = '介词' AND subcategory LIKE '%搭配%'`
      );

    console.log(`找到 ${exercises.length} 道固定搭配题目`);

    let linkedCount = 0;
    let createdCount = 0;

    for (const exercise of exercises) {
      const question = exercise.question?.toLowerCase() || '';
      const options = exercise.options as string[] || [];
      const correctAnswerIndex = exercise.correctAnswer?.toUpperCase() || '';

      // 从选项中提取实际答案内容
      let actualAnswer = '';
      if (options.length > 0 && correctAnswerIndex) {
        const correctOption = options.find(opt =>
          opt.startsWith(correctAnswerIndex + ')') || opt.startsWith(correctAnswerIndex + '.')
        );
        if (correctOption) {
          // 提取选项字母后的内容
          actualAnswer = correctOption.replace(/^[A-D][).]\s*/, '').toLowerCase();
        }
      }

      // 填入答案后的完整句子
      const fullSentence = question.replace('___', actualAnswer);

      // 尝试匹配固定搭配
      let matchedCollocation: string | null = null;

      for (const [key, phrase] of Object.entries(COMMON_COLLOCATIONS)) {
        if (fullSentence.includes(phrase.toLowerCase())) {
          matchedCollocation = phrase;
          break;
        }
      }

      if (!matchedCollocation) {
        // 尝试其他模式
        if (fullSentence.includes('be ') && fullSentence.includes(' to')) {
          matchedCollocation = 'be ' + fullSentence.split('be ')[1].split(' to')[0].trim() + ' to';
        } else if (fullSentence.includes('be ') && fullSentence.includes(' of')) {
          matchedCollocation = 'be ' + fullSentence.split('be ')[1].split(' of')[0].trim() + ' of';
        }
      }

      if (matchedCollocation) {
        // 查找或创建固定搭配
        const [existing] = await db.select()
          .from(collocations)
          .where(eq(collocations.phrase, matchedCollocation));

        if (existing) {
          // 更新练习题关联
          await db.update(grammarExercises)
            .set({ collocationId: existing.id })
            .where(eq(grammarExercises.id, exercise.id));
          linkedCount++;
          console.log(`✓ 关联: ${matchedCollocation}`);
        } else {
          // 创建新的固定搭配
          const [newCollocation] = await db.insert(collocations)
            .values({
              phrase: matchedCollocation,
              meaning: `固定搭配：${matchedCollocation}`,
              category: '动词+介词',
              difficulty: 1
            })
            .returning();

          // 更新练习题关联
          await db.update(grammarExercises)
            .set({ collocationId: newCollocation.id })
            .where(eq(grammarExercises.id, exercise.id));
          createdCount++;
          linkedCount++;
          console.log(`✓ 创建并关联: ${matchedCollocation}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: exercises.length,
        linked: linkedCount,
        created: createdCount
      }
    });

  } catch (error) {
    console.error('关联固定搭配失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
