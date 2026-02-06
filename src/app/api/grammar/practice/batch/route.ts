import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { grammarExercises } from '@/storage/database/shared/schema';
import { eq, sql } from 'drizzle-orm';
import { getGrammarKnowledgeLink } from '@/utils/grammarKnowledgeLinks';

/**
 * 分组批改语法练习题
 */
export async function POST(request: NextRequest) {
  try {
    const { submissions, userId } = await request.json();

    if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
      return NextResponse.json(
        { success: false, error: '提交的答案为空' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 批量获取练习题
    const exerciseIds = submissions.map(s => s.exerciseId);
    const exercises = await db
      .select()
      .from(grammarExercises)
      .where(sql`id = ANY(${exerciseIds})`);

    // 构建题目映射
    const exerciseMap = new Map(exercises.map(ex => [ex.id, ex]));

    // 批改结果
    const results = submissions.map((submission) => {
      const exercise = exerciseMap.get(submission.exerciseId);
      if (!exercise) {
        return {
          exerciseId: submission.exerciseId,
          isCorrect: false,
          error: '题目不存在',
        };
      }

      // 判断答案是否正确
      const isCorrect = evaluateAnswer(
        submission.userAnswer,
        exercise.correctAnswer,
        exercise.options as string[] | null,
        exercise.type
      );

      // 获取语法知识点链接
      const knowledgeLink = getGrammarKnowledgeLink(exercise.category || '', exercise.subcategory || '');

      // 构建解析
      const explanation = exercise.explanation || buildDefaultExplanation(exercise, isCorrect, submission.userAnswer);

      return {
        exerciseId: submission.exerciseId,
        isCorrect,
        userAnswer: submission.userAnswer,
        correctAnswer: exercise.correctAnswer,
        explanation,
        category: exercise.category,
        subcategory: exercise.subcategory,
        knowledgeLink,
      };
    });

    // 统计结果
    const correctCount = results.filter(r => r.isCorrect).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          correctCount,
          totalCount,
          accuracy: Math.round((correctCount / totalCount) * 100),
        },
      },
    });
  } catch (error) {
    console.error('分组批改失败:', error);
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
 * 判断答案是否正确
 */
function evaluateAnswer(
  userAnswer: string,
  correctAnswer: string,
  options: string[] | null,
  exerciseType: string
): boolean {
  if (exerciseType === '词转题') {
    // 词转题：忽略大小写比较
    return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  }

  if (options && Array.isArray(options) && options.length > 0) {
    // 选择题
    const correctOption = options.find(opt =>
      opt.startsWith(correctAnswer + ')') || opt.startsWith(correctAnswer + '.')
    );

    if (correctOption) {
      const correctContent = correctOption.replace(/^[A-D][).]\s*/, '').trim().toLowerCase();
      if (userAnswer.trim().toLowerCase() === correctContent) {
        return true;
      }
      // 也允许只填选项字母
      return userAnswer.trim().toUpperCase() === correctAnswer.trim().toUpperCase();
    }
  } else {
    // 填空题：忽略大小写、标点
    const cleanUser = userAnswer.trim().toLowerCase().replace(/[.,!?;:'"]/g, '');
    const cleanCorrect = correctAnswer.trim().toLowerCase().replace(/[.,!?;:'"]/g, '');
    return cleanUser === cleanCorrect;
  }

  return false;
}

/**
 * 构建默认解析
 */
function buildDefaultExplanation(
  exercise: any,
  isCorrect: boolean,
  userAnswer: string
): string {
  if (isCorrect) {
    return '回答正确！';
  } else {
    return `回答错误。正确答案是：${exercise.correctAnswer}。${exercise.explanation || ''}`;
  }
}
