/**
 * 错题上传 API（用户上传错题）
 * POST /api/mistakes/upload
 * - 上传错题文件（图片/PDF）
 * - 调用 Gemini 识别题目
 * - 处理配额限制
 * - 返回友好的错误提示
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/utils/db';
import { checkPermission, getCurrentUser } from '@/utils/auth';
import { callAIWithRetry } from '@/utils/aiClient';
import { grammarMistakes, grammarPoints, transformationMistakes, wordTransformations } from '@/storage/database/shared/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // 1. 获取当前用户
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    // 2. 验证文件
    if (!file) {
      return NextResponse.json(
        { error: '请选择文件' },
        { status: 400 }
      );
    }

    // 检查文件大小
    if (file.size > 20 * 1024 * 1024) {  // 20MB
      return NextResponse.json(
        { error: '文件大小不能超过 20MB' },
        { status: 400 }
      );
    }

    // 检查文件类型
    const fileType = file.type;
    if (!fileType.match(/^(image\/|application\/pdf)$/)) {
      return NextResponse.json(
        { error: '仅支持图片和 PDF 文件' },
        { status: 400 }
      );
    }

    // 3. 上传到对象存储
    const { fileUrl, fileName } = await uploadToStorage(file);

    // 4. 提取文件内容
    const fileContent = await extractFileContent(file, fileUrl);

    // 5. 构建 Gemini 提示词
    const prompt = `
请从以下图片/PDF中识别题目。

重要要求：
1. 识别题目内容、选项、正确答案
2. 提供详细的解析
3. 识别知识点（如"一般现在时"、"过去进行时"等）
4. 识别难度（easy / intermediate / hard）
5. 识别题目类型（grammar / word-formation / reading 等）

返回格式（严格JSON）：
{
  "question": "题目内容",
  "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
  "correctAnswer": "B",
  "explanation": "解析说明",
  "knowledgePoint": "知识点",
  "subKnowledgePoint": "子知识点",
  "difficulty": "easy",
  "category": "grammar"
}

文件内容：
${fileContent}
`;

    // 6. 调用AI服务（带重试）
    console.log(`[错题上传] 用户 ${currentUser.userId} 上传文件: ${fileName}`);
    const aiResponse = await callAIWithRetry(prompt, 3);

    // 7. 处理配额错误
    if (!aiResponse.success && aiResponse.error?.isQuotaError) {
      console.warn(`[错题上传] 配额错误: ${aiResponse.error.message}`);
      
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: aiResponse.error.message,
            isQuotaError: true,
            retryAfter: aiResponse.error.retryAfter,
            userMessage: aiResponse.error.userMessage,
          },
        },
        { status: 429 }
      );
    }

    // 8. 处理其他错误
    if (!aiResponse.success) {
      console.error(`[错题上传] API 错误: ${aiResponse.error?.message}`);
      
      return NextResponse.json(
        {
          success: false,
          error: {
            code: aiResponse.error?.code || 'API_ERROR',
            message: aiResponse.error?.message || '识别失败',
            userMessage: aiResponse.error?.userMessage || '识别失败，请稍后重试',
          },
        },
        { status: 500 }
      );
    }

    // 9. 解析结果
    const question = JSON.parse(aiResponse.content || '{}');
    const category = question.category || 'reading';

    // 10. 根据题型进行不同的处理
    if (category === 'grammar') {
      // 语法题 → 保存到 grammarMistakes
      return await saveGrammarMistake(currentUser.userId, question);
    } else if (category === 'word-formation') {
      // 词转练习 → 保存到 transformationMistakes
      return await saveTransformationMistake(currentUser.userId, question);
    } else {
      // 阅读理解 → 保存到 user_mistakes（保持旧逻辑）
      return await saveGeneralMistake(currentUser.userId, question);
    }

  } catch (error: any) {
    console.error('[错题上传] 错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error.message || '未知错误',
          userMessage: '添加失败，请稍后重试',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * 上传到对象存储
 */
async function uploadToStorage(file: File): Promise<{ fileUrl: string; fileName: string }> {
  // 实现对象存储上传逻辑
  // 这里返回模拟数据
  const fileName = `${Date.now()}_${file.name}`;
  const fileUrl = `https://storage.example.com/${fileName}`;
  
  return { fileUrl, fileName };
}

/**
 * 提取文件内容
 */
async function extractFileContent(file: File, fileUrl: string): Promise<string> {
  // 实现文件内容提取逻辑
  // 这里返回占位文本
  return '文件内容（需要实现解析逻辑）';
}

/**
 * 更新错题统计
 */
async function updateMistakeStats(userId: string, question: any) {
  try {
    // 更新 user_mistake_stats 表
    await query(`
      INSERT INTO user_mistake_stats (user_id, total_count, knowledge_points, difficulties)
      VALUES (
        $1, 
        1, 
        jsonb_build_object($2, 1), 
        jsonb_build_object($3, 1)
      )
      ON CONFLICT (user_id) DO UPDATE SET
        total_count = user_mistake_stats.total_count + 1,
        knowledge_points = jsonb_set(
          COALESCE(user_mistake_stats.knowledge_points, '{}'::jsonb),
          ARRAY[$2],
          COALESCE((user_mistake_stats.knowledge_points->>$2)::int, 0) + 1
        ),
        difficulties = jsonb_set(
          COALESCE(user_mistake_stats.difficulties, '{}'::jsonb),
          ARRAY[$3],
          COALESCE((user_mistake_stats.difficulties->$3)::int, 0) + 1
        ),
        last_updated = NOW()
    `, [userId, question.knowledgePoint, question.difficulty]);
  } catch (error) {
    console.error('更新统计失败:', error);
    // 不影响主流程
  }
}

/**
 * 保存语法错题到 grammarMistakes 表
 */
async function saveGrammarMistake(userId: string, question: any): Promise<NextResponse> {
  try {
    const db = await getDb();

    // 查找或创建语法知识点
    let grammarPointId = null;
    if (question.knowledgePoint) {
      const existingPoints = await db
        .select()
        .from(grammarPoints)
        .where(eq(grammarPoints.name, question.knowledgePoint));

      if (existingPoints.length > 0) {
        grammarPointId = existingPoints[0].id;
      } else {
        const [newPoint] = await db
          .insert(grammarPoints)
          .values({
            name: question.knowledgePoint,
            category: question.subKnowledgePoint || '通用',
            description: `用户错题 - ${question.knowledgePoint}`,
            level: '8年级',
          })
          .returning();
        grammarPointId = newPoint.id;
      }
    }

    // 去重检查
    const [duplicate] = await db
      .select()
      .from(grammarMistakes)
      .where(
        and(
          eq(grammarMistakes.userId, userId),
          eq(grammarMistakes.question, question.question)
        )
      )
      .limit(1);

    if (duplicate) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'DUPLICATE_QUESTION',
          message: '该语法题已存在于错题库中',
          userMessage: '这道语法题你之前已经添加过了',
        },
      }, { status: 409 });
    }

    // 保存语法错题
    const [mistake] = await db
      .insert(grammarMistakes)
      .values({
        userId,
        grammarPointId: grammarPointId || '',
        question: question.question,
        wrongAnswer: question.wrongAnswer || '',
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        analysis: question.analysis || null,
        mastered: false,
      })
      .returning();

    console.log(`[错题上传] 成功添加语法错题: ${mistake.id}`);

    return NextResponse.json({
      success: true,
      message: '语法错题添加成功',
      data: {
        id: mistake.id,
        category: 'grammar',
        question: question.question,
        knowledgePoint: question.knowledgePoint,
        difficulty: question.difficulty,
      },
    });
  } catch (error) {
    console.error('[保存语法错题] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SAVE_ERROR',
          message: error instanceof Error ? error.message : '保存失败',
          userMessage: '添加失败，请稍后重试',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * 保存词转错题到 transformationMistakes 表
 */
async function saveTransformationMistake(userId: string, question: any): Promise<NextResponse> {
  try {
    const db = await getDb();

    // 提取词转信息
    const wordMatch = question.question.match(/\b(\w+)\b/);
    const word = wordMatch ? wordMatch[1] : '';

    // 查找对应的词转练习（如果有）
    let transformationId = null;
    if (word) {
      const transformations = await db
        .select()
        .from(wordTransformations)
        .limit(1); // 简化处理，取第一个

      if (transformations.length > 0) {
        transformationId = transformations[0].id;
      }
    }

    // 去重检查
    const [duplicate] = await db
      .select()
      .from(transformationMistakes)
      .where(
        and(
          eq(transformationMistakes.userId, userId),
          eq(transformationMistakes.sentence, question.question)
        )
      )
      .limit(1);

    if (duplicate) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'DUPLICATE_QUESTION',
          message: '该词转题已存在于错题库中',
          userMessage: '这道词转题你之前已经添加过了',
        },
      }, { status: 409 });
    }

    // 保存词转错题
    const [mistake] = await db
      .insert(transformationMistakes)
      .values({
        userId,
        transformationId: transformationId || '',
        word,
        type: 'unknown', // 需要AI识别，这里简化处理
        sentence: question.question,
        wrongAnswer: question.wrongAnswer || '',
        correctAnswer: question.correctAnswer,
        mistakeType: 'unknown',
        explanation: question.explanation,
        mastered: false,
        errorCount: 1,
      })
      .returning();

    console.log(`[错题上传] 成功添加词转错题: ${mistake.id}`);

    return NextResponse.json({
      success: true,
      message: '词转错题添加成功',
      data: {
        id: mistake.id,
        category: 'word-formation',
        question: question.question,
        word,
        difficulty: question.difficulty,
      },
    });
  } catch (error) {
    console.error('[保存词转错题] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SAVE_ERROR',
          message: error instanceof Error ? error.message : '保存失败',
          userMessage: '添加失败，请稍后重试',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * 保存通用错题到 user_mistakes 表（阅读理解等）
 */
async function saveGeneralMistake(userId: string, question: any): Promise<NextResponse> {
  try {
    // 去重检查
    const duplicateCheck = await query(
      `SELECT id FROM user_mistakes 
       WHERE user_id = $1 AND question = $2`,
      [userId, question.question]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'DUPLICATE_QUESTION',
          message: '该题目已存在于错题库中',
          userMessage: '这道题你之前已经添加过了',
        },
      }, { status: 409 });
    }

    // 保存错题
    const result = await query(
      `INSERT INTO user_mistakes (
         user_id, question, options, correct_answer, 
         explanation, knowledge_point, sub_knowledge_point, 
         difficulty, category, source
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        userId,
        question.question,
        JSON.stringify(question.options),
        question.correctAnswer,
        question.explanation,
        question.knowledgePoint,
        question.subKnowledgePoint,
        question.difficulty,
        question.category,
        'upload',
      ]
    );

    const mistakeId = result.rows[0].id;

    // 更新统计数据
    await updateMistakeStats(userId, question);

    console.log(`[错题上传] 成功添加通用错题: ${mistakeId}`);

    return NextResponse.json({
      success: true,
      message: '错题添加成功',
      data: {
        id: mistakeId,
        category: question.category || 'reading',
        question: question.question,
        knowledgePoint: question.knowledgePoint,
        difficulty: question.difficulty,
      },
    });
  } catch (error) {
    console.error('[保存通用错题] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SAVE_ERROR',
          message: error instanceof Error ? error.message : '保存失败',
          userMessage: '添加失败，请稍后重试',
        },
      },
      { status: 500 }
    );
  }
}
