/**
 * 学生错题记录 API
 * 支持错题的创建、更新、查询和标记掌握
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/db';
import {
  questions,
  studentMistakes,
  examPapers,
} from '@/storage/database/shared/schema';
import { eq, and, desc, or } from 'drizzle-orm';
import { checkPermission } from '@/utils/auth';
import { generateQuestionHash } from '@/utils/questionHash';
import { z } from 'zod';

// 错题记录请求 schema
const mistakeSchema = z.object({
  questionId: z.string().optional(),
  question: z.string().optional(), // 如果题目不在数据库中，可以传入题目内容
  options: z.array(z.string()).optional(),
  paperId: z.string().optional(),
  wrongAnswer: z.string(),
});

// GET /api/mistakes - 查询学生错题
export async function GET(request: NextRequest) {
  try {
    // 验证用户权限
    const permission = await checkPermission('user');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const userId = permission.userId!;
    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get('paperId');
    const mastered = searchParams.get('mastered'); // 'true', 'false', or undefined
    const type = searchParams.get('type'); // 'grammar', 'word_formation', 'reading'

    const db = await getDb();

    // 构建查询条件
    const conditions = [eq(studentMistakes.userId, userId)];

    if (paperId) {
      conditions.push(eq(studentMistakes.paperId, paperId));
    }

    if (mastered === 'true') {
      conditions.push(eq(studentMistakes.mastered, true));
    } else if (mastered === 'false') {
      conditions.push(eq(studentMistakes.mastered, false));
    }

    if (type) {
      conditions.push(eq(questions.type, type));
    }

    // 查询错题
    const mistakes = await db
      .select({
        mistake: studentMistakes,
        question: questions,
        paper: examPapers,
      })
      .from(studentMistakes)
      .leftJoin(questions, eq(studentMistakes.questionId, questions.id))
      .leftJoin(examPapers, eq(studentMistakes.paperId, examPapers.id))
      .where(and(...conditions))
      .orderBy(desc(studentMistakes.lastWrongAt));

    return NextResponse.json({
      success: true,
      data: mistakes,
      count: mistakes.length,
    });
  } catch (error) {
    console.error('[错题查询] 错误:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '查询失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// POST /api/mistakes - 记录错题
export async function POST(request: NextRequest) {
  try {
    // 验证用户权限
    const permission = await checkPermission('user');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const userId = permission.userId!;
    const body = await request.json();

    // 验证请求参数
    const validatedData = mistakeSchema.parse(body);

    const db = await getDb();

    let questionId = validatedData.questionId;

    // 如果没有提供 questionId，尝试通过题目内容查找
    if (!questionId && validatedData.question) {
      const hash = generateQuestionHash({
        question: validatedData.question,
        options: validatedData.options,
      });

      const [existingQuestion] = await db
        .select()
        .from(questions)
        .where(eq(questions.questionHash, hash))
        .limit(1);

      if (existingQuestion) {
        questionId = existingQuestion.id!;
      } else {
        // 题目不存在，创建新题目
        const now = new Date().toISOString();
        const [newQuestion] = await db.insert(questions)
          .values({
            questionHash: hash,
            question: validatedData.question!,
            type: 'unknown', // 可以根据其他信息推断
            options: validatedData.options ? JSON.stringify(validatedData.options) : null,
            correctAnswer: '', // 需要后续补充
            explanation: '',
            difficulty: 2,
            createdAt: now,
            updatedAt: now,
            firstSeenAt: now,
            appearanceCount: 1,
          })
          .returning();

        questionId = newQuestion.id!;
      }
    }

    if (!questionId) {
      return NextResponse.json(
        { error: '无法识别题目，请提供题目内容或题目 ID' },
        { status: 400 }
      );
    }

    // 检查是否已有错题记录
    const [existingMistake] = await db
      .select()
      .from(studentMistakes)
      .where(
        and(
          eq(studentMistakes.userId, userId),
          eq(studentMistakes.questionId, questionId)
        )
      )
      .limit(1);

    if (existingMistake) {
      // 更新现有错题记录
      await db.update(studentMistakes)
        .set({
          wrongAnswer: validatedData.wrongAnswer,
          attemptCount: existingMistake.attemptCount + 1,
          lastWrongAt: new Date().toISOString(),
          mastered: false,
          consecutiveCorrect: 0, // 重置连续正确次数
        })
        .where(eq(studentMistakes.id, existingMistake.id));

      console.log(`[错题记录] 更新错题: ${questionId}`);
    } else {
      // 创建新错题记录
      const now = new Date().toISOString();
      await db.insert(studentMistakes)
        .values({
          userId,
          questionId,
          paperId: validatedData.paperId,
          wrongAnswer: validatedData.wrongAnswer,
          attemptCount: 1,
          firstWrongAt: now,
          lastWrongAt: now,
          mastered: false,
          consecutiveCorrect: 0,
        });

      console.log(`[错题记录] 新增错题: ${questionId}`);
    }

    return NextResponse.json({
      success: true,
      message: '错题记录成功',
    });
  } catch (error) {
    console.error('[错题记录] 错误:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '记录失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// PATCH /api/mistakes - 更新错题（标记掌握等）
export async function PATCH(request: NextRequest) {
  try {
    // 验证用户权限
    const permission = await checkPermission('user');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const userId = permission.userId!;
    const body = await request.json();

    const { mistakeId, mastered, notes } = body;

    if (!mistakeId) {
      return NextResponse.json(
        { error: '请提供错题 ID' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 查询错题
    const [mistake] = await db
      .select()
      .from(studentMistakes)
      .where(
        and(
          eq(studentMistakes.id, mistakeId),
          eq(studentMistakes.userId, userId)
        )
      )
      .limit(1);

    if (!mistake) {
      return NextResponse.json(
        { error: '错题不存在' },
        { status: 404 }
      );
    }

    // 构建更新数据
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (mastered !== undefined) {
      updateData.mastered = mastered;
      if (mastered) {
        updateData.lastCorrectAt = new Date();
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // 更新错题
    await db.update(studentMistakes)
      .set(updateData)
      .where(eq(studentMistakes.id, mistakeId));

    return NextResponse.json({
      success: true,
      message: '错题更新成功',
    });
  } catch (error) {
    console.error('[错题更新] 错误:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '更新失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/mistakes - 删除错题
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户权限
    const permission = await checkPermission('user');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const userId = permission.userId!;
    const { searchParams } = new URL(request.url);
    const mistakeId = searchParams.get('mistakeId');

    if (!mistakeId) {
      return NextResponse.json(
        { error: '请提供错题 ID' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 删除错题
    await db.delete(studentMistakes)
      .where(
        and(
          eq(studentMistakes.id, mistakeId),
          eq(studentMistakes.userId, userId)
        )
      );

    return NextResponse.json({
      success: true,
      message: '错题删除成功',
    });
  } catch (error) {
    console.error('[错题删除] 错误:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '删除失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
