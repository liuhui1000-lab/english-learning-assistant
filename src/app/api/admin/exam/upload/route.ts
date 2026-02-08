/**
 * 模拟卷统一上传API
 * 支持混合题型的智能识别和自动分配
 * - 语法题 → 语法题库
 * - 词转练习 → 词转练习库
 * - 阅读理解 → 阅读理解库
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseQuestions, groupQuestionsByType, type Question } from '@/utils/questionParser';
import { parseFile, getSupportedFormats, isFormatSupported } from '@/utils/fileParser';
import { getDb, query } from '@/utils/db';
import { grammarExercises, grammarPoints, articles, userReadingProgress } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';
import { checkPermission } from '@/utils/auth';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const version = formData.get('version') as string;
    const description = formData.get('description') as string;

    // 验证必填字段
    if (!file) {
      return NextResponse.json(
        { error: '请选择文件' },
        { status: 400 }
      );
    }

    if (!version) {
      return NextResponse.json(
        { error: '请输入版本号' },
        { status: 400 }
      );
    }

    // 验证文件格式
    if (!isFormatSupported(file.name)) {
      return NextResponse.json(
        { error: `仅支持 ${getSupportedFormats().join(', ')} 格式文件` },
        { status: 400 }
      );
    }

    // 解析文件内容
    console.log(`[模拟卷上传] 开始解析文件: ${file.name}`);
    let text = '';

    try {
      const parseResult = await parseFile(file);
      text = parseResult.text;

      if (parseResult.warnings.length > 0) {
        console.warn('[模拟卷上传] 解析警告:', parseResult.warnings);
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : '文件解析失败' },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: '文件内容为空' },
        { status: 400 }
      );
    }

    // 智能解析题目
    const parseResult = await parseQuestions(text, { useAI: true });

    if (!parseResult.success || parseResult.questions.length === 0) {
      return NextResponse.json(
        { error: '未能从文件中解析出题目，请检查文件格式' },
        { status: 400 }
      );
    }

    console.log(`[模拟卷上传] 解析成功: 共 ${parseResult.totalQuestions} 道题`);

    // 按类型分组
    const groupedQuestions = groupQuestionsByType(parseResult.questions);

    // 保存到不同的模块
    const results = {
      grammar: await importGrammarExercises(groupedQuestions.grammar, version),
      wordFormation: await importWordFormations(groupedQuestions.wordFormation, version),
      reading: await importReadingComprehensions(groupedQuestions.reading, version),
    };

    return NextResponse.json({
      success: true,
      data: {
        version,
        fileName: file.name,
        totalQuestions: parseResult.totalQuestions,
        summary: parseResult.summary,
        results,
      },
      message: `成功导入 ${parseResult.totalQuestions} 道题目`,
    });
  } catch (error) {
    console.error('[模拟卷上传] 错误:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '上传失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * 导入语法题
 */
async function importGrammarExercises(
  questions: Question[],
  version: string
): Promise<{ success: number; failed: number }> {
  const db = await getDb();
  let success = 0;
  let failed = 0;

  for (const question of questions) {
    try {
      // 查找或创建语法知识点
      let grammarPointId = null;

      if (question.knowledgePoint) {
        const existingPoints = await db
          .select()
          .from(grammarPoints)
          .where(eq(grammarPoints.name, question.knowledgePoint || ''));

        if (existingPoints.length > 0) {
          grammarPointId = existingPoints[0].id;
        } else {
          const [newPoint] = await db
            .insert(grammarPoints)
            .values({
              name: question.knowledgePoint,
              category: question.subKnowledgePoint || '通用',
              description: `模拟卷 ${version} - ${question.knowledgePoint}`,
              level: '8年级', // 初二
            })
            .returning();

          grammarPointId = newPoint.id;
        }
      }

      // 插入语法题
      const insertData: any = {
        question: question.question,
        type: 'choice', // 默认选择题
        options: question.options ? JSON.stringify(question.options) : null,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        source: `模拟卷 ${version}`,
        questionNumber: question.questionNumber,
        category: question.knowledgePoint || '通用',
        subcategory: question.subKnowledgePoint || '',
      };

      // 只有在有 grammarPointId 时才添加
      if (grammarPointId) {
        insertData.grammarPointId = grammarPointId;
      }

      // 添加难度等级
      insertData.difficulty = question.difficulty === 'easy' ? 1 : question.difficulty === 'hard' ? 3 : 2;

      await db.insert(grammarExercises).values(insertData);

      success++;
    } catch (error) {
      console.error(`导入语法题失败:`, error);
      failed++;
    }
  }

  return { success, failed };
}

/**
 * 导入词转练习
 */
async function importWordFormations(
  questions: Question[],
  version: string
): Promise<{ success: number; failed: number }> {
  const db = await getDb();
  let success = 0;
  let failed = 0;

  for (const question of questions) {
    try {
      // 构建词转练习数据
      const transformations = [
        {
          word: question.baseWord || '',
          type: question.transformationType || 'unknown',
          meaning: '',
          sentence: question.question,
        },
      ];

      // 插入词转练习
      await query(
        `
        INSERT INTO word_transformations (id, base_word, base_meaning, transformations, difficulty, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT DO NOTHING
        `,
        [
          randomUUID(),
          question.baseWord || '',
          '', // 基础词义，需要后续补充
          JSON.stringify(transformations),
          2, // 初二难度
        ]
      );

      success++;
    } catch (error) {
      console.error(`导入词转练习失败:`, error);
      failed++;
    }
  }

  return { success, failed };
}

/**
 * 导入阅读理解
 */
async function importReadingComprehensions(
  questions: Question[],
  version: string
): Promise<{ success: number; failed: number }> {
  const db = await getDb();
  let success = 0;
  let failed = 0;

  for (const question of questions) {
    try {
      // 插入阅读理解文章
      const [article] = await db
        .insert(articles)
        .values({
          title: `模拟卷 ${version} - 阅读理解`,
          content: question.article || question.question,
          level: 'intermediate', // 初二
          wordCount: (question.article || question.question).length,
          readTime: Math.ceil((question.article || question.question).length / 200), // 粗略估算
          category: '模拟卷',
          questions: question.articleQuestions ? JSON.stringify(question.articleQuestions) : null,
        })
        .returning();

      // 如果有子问题，也可以单独存储
      if (question.articleQuestions) {
        for (const subQuestion of question.articleQuestions) {
          await db.insert(userReadingProgress).values({
            userId: 'system', // 系统预置
            articleId: article.id,
            score: 0,
            completed: false,
            timeSpent: 0,
          });
        }
      }

      success++;
    } catch (error) {
      console.error(`导入阅读理解失败:`, error);
      failed++;
    }
  }

  return { success, failed };
}
